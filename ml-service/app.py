import json
import os
from collections import defaultdict
from typing import Any

import asyncpg
import httpx
from fastapi import FastAPI, Header, HTTPException, Query

app = FastAPI(title="CineMind ML Recommender", version="1.1.0")

DATABASE_URL = os.getenv("DATABASE_URL")
ML_INTERNAL_TOKEN = os.getenv("ML_INTERNAL_TOKEN")
TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE_URL = "https://api.themoviedb.org/3"

MIN_RATED_MOVIES = int(os.getenv("MIN_RATED_MOVIES", "3"))
DEFAULT_LIMIT = int(os.getenv("DEFAULT_RECOMMENDATION_LIMIT", "30"))
MAX_LIMIT = int(os.getenv("MAX_RECOMMENDATION_LIMIT", "60"))
CANDIDATE_POOL_SIZE = int(os.getenv("CANDIDATE_POOL_SIZE", "240"))
TOP_CAST_COUNT = int(os.getenv("TOP_CAST_COUNT", "5"))
TMDB_CONCURRENCY = int(os.getenv("TMDB_CONCURRENCY", "10"))
SEED_MOVIE_COUNT = int(os.getenv("SEED_MOVIE_COUNT", "8"))

pool: asyncpg.Pool | None = None
http_client: httpx.AsyncClient | None = None
tmdb_semaphore: "asyncio.Semaphore | None" = None


import asyncio


def parse_genres(raw_genres: Any) -> list[str]:
    if raw_genres is None:
        return []

    if isinstance(raw_genres, list):
        return [str(g).strip().lower() for g in raw_genres if str(g).strip()]

    if isinstance(raw_genres, str):
        raw_genres = raw_genres.strip()
        if not raw_genres:
            return []
        try:
            parsed = json.loads(raw_genres)
            if isinstance(parsed, list):
                return [str(g).strip().lower() for g in parsed if str(g).strip()]
        except json.JSONDecodeError:
            return [g.strip().lower() for g in raw_genres.split(",") if g.strip()]

    return []


async def get_movie_cache_features(movie_id: int) -> dict[str, Any]:
    assert pool is not None

    row = await pool.fetchrow(
        """
        SELECT movie_id, title, year, director, genres, poster_path
        FROM movie_cache
        WHERE movie_id = $1
        """,
        movie_id,
    )

    if not row:
        return {
            "movie_id": movie_id,
            "title": None,
            "year": None,
            "poster_path": None,
            "genres": [],
            "director": None,
            "vote_average": None,
            "actors": [],
            "keywords": [],
        }

    return {
        "movie_id": int(row["movie_id"]),
        "title": row["title"],
        "year": row["year"],
        "poster_path": row["poster_path"],
        "genres": parse_genres(row["genres"]),
        "director": row["director"].strip().lower() if row["director"] else None,
        "vote_average": None,
        "actors": [],
        "keywords": [],
    }


async def enrich_tmdb_features(base: dict[str, Any]) -> dict[str, Any]:
    if not TMDB_API_KEY:
        return base

    assert http_client is not None
    assert tmdb_semaphore is not None

    movie_id = base["movie_id"]
    details_url = f"{TMDB_BASE_URL}/movie/{movie_id}"

    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "append_to_response": "credits,keywords",
    }

    try:
        async with tmdb_semaphore:
            details_res = await http_client.get(details_url, params=params)

        if details_res.status_code != 200:
            return base

        details_data = details_res.json()

        if not base["title"]:
            base["title"] = details_data.get("title")
        if not base["year"] and details_data.get("release_date"):
            try:
                base["year"] = int(details_data["release_date"][:4])
            except (TypeError, ValueError):
                pass
        if not base["poster_path"]:
            base["poster_path"] = details_data.get("poster_path")
        if details_data.get("vote_average") is not None:
            try:
                base["vote_average"] = float(details_data["vote_average"])
            except (TypeError, ValueError):
                pass
        if not base["genres"]:
            base["genres"] = [
                g.get("name", "").strip().lower()
                for g in details_data.get("genres", [])
                if g.get("name")
            ]

        credits_data = details_data.get("credits", {})
        cast = credits_data.get("cast", [])[:TOP_CAST_COUNT]
        base["actors"] = [
            person.get("name", "").strip().lower()
            for person in cast
            if person.get("name")
        ]

        if not base["director"]:
            director_obj = next(
                (c for c in credits_data.get("crew", []) if c.get("job") == "Director"),
                None,
            )
            if director_obj and director_obj.get("name"):
                base["director"] = director_obj["name"].strip().lower()

        keyword_list = details_data.get("keywords", {}).get("keywords", [])
        base["keywords"] = [
            item.get("name", "").strip().lower() for item in keyword_list if item.get("name")
        ]

    except Exception:
        return base

    return base


async def get_full_movie_features(movie_id: int, cache: dict[int, dict[str, Any]]) -> dict[str, Any]:
    if movie_id in cache:
        return cache[movie_id]

    base = await get_movie_cache_features(movie_id)

    has_strong_cache = bool(base.get("genres") and base.get("director") and base.get("title"))
    features = base if has_strong_cache else await enrich_tmdb_features(base)
    cache[movie_id] = features
    return features


def add_weight(bucket: dict[str, float], key: str | None, value: float) -> None:
    if key and key.strip():
        bucket[key.strip().lower()] += value


def add_weights(bucket: dict[str, float], keys: list[str], value: float) -> None:
    for key in keys:
        add_weight(bucket, key, value)


async def get_user_ratings(user_id: int) -> list[asyncpg.Record]:
    assert pool is not None
    rows = await pool.fetch(
        """
        SELECT movie_id, rating
        FROM user_movies
        WHERE user_id = $1
        ORDER BY rating DESC, updated_at DESC NULLS LAST
        """,
        user_id,
    )
    return rows


async def get_candidate_ids(
    user_rows: list[asyncpg.Record],
    exclude_movie_ids: set[int],
    target_count: int,
) -> list[int]:
    if not TMDB_API_KEY:
        assert pool is not None
        rows = await pool.fetch(
            """
            SELECT movie_id
            FROM movie_cache
            ORDER BY last_updated DESC
            LIMIT $1
            """,
            target_count * 2,
        )
        ids = [int(r["movie_id"]) for r in rows if int(r["movie_id"]) not in exclude_movie_ids]
        return ids[:target_count]

    assert http_client is not None
    assert tmdb_semaphore is not None

    seen_ids: set[int] = set()
    candidates: list[int] = []

    seed_movies = [
        int(row["movie_id"])
        for row in user_rows
        if float(row["rating"]) >= 4.0
    ][:SEED_MOVIE_COUNT]

    async def fetch_seed_candidates(seed_id: int, endpoint: str) -> list[int]:
        try:
            async with tmdb_semaphore:
                res = await http_client.get(
                    f"{TMDB_BASE_URL}/movie/{seed_id}/{endpoint}",
                    params={"api_key": TMDB_API_KEY, "language": "en-US", "page": 1},
                )
            if res.status_code != 200:
                return []
            return [
                int(movie.get("id", 0) or 0)
                for movie in res.json().get("results", [])
                if int(movie.get("id", 0) or 0) > 0
            ]
        except Exception:
            return []

    seed_tasks = []
    for seed in seed_movies:
        seed_tasks.append(fetch_seed_candidates(seed, "recommendations"))
        seed_tasks.append(fetch_seed_candidates(seed, "similar"))

    if seed_tasks:
        seed_results = await asyncio.gather(*seed_tasks)
        for result in seed_results:
            for movie_id in result:
                if movie_id in exclude_movie_ids or movie_id in seen_ids:
                    continue
                seen_ids.add(movie_id)
                candidates.append(movie_id)
                if len(candidates) >= target_count:
                    return candidates[:target_count]

    page = 1
    while len(candidates) < target_count and page <= 10:
        try:
            async with tmdb_semaphore:
                res = await http_client.get(
                    f"{TMDB_BASE_URL}/discover/movie",
                    params={
                        "api_key": TMDB_API_KEY,
                        "language": "en-US",
                        "region": "US",
                        "sort_by": "popularity.desc",
                        "include_adult": "false",
                        "page": page,
                    },
                )
            if res.status_code != 200:
                break

            for movie in res.json().get("results", []):
                movie_id = int(movie.get("id", 0) or 0)
                if movie_id <= 0 or movie_id in exclude_movie_ids or movie_id in seen_ids:
                    continue
                seen_ids.add(movie_id)
                candidates.append(movie_id)
                if len(candidates) >= target_count:
                    break
        except Exception:
            break

        page += 1

    return candidates[:target_count]


async def score_candidates(user_id: int, limit: int) -> dict[str, Any]:
    user_rows = await get_user_ratings(user_id)
    if not user_rows:
        return {
            "type": "no_ratings",
            "recommendations": [],
            "reason": "User has no ratings yet",
        }

    feature_cache: dict[int, dict[str, Any]] = {}

    rated_movies = [int(r["movie_id"]) for r in user_rows]
    rated_set = set(rated_movies)
    ratings = [float(r["rating"]) for r in user_rows]
    avg_rating = sum(ratings) / len(ratings)

    genre_weights: dict[str, float] = defaultdict(float)
    actor_weights: dict[str, float] = defaultdict(float)
    director_weights: dict[str, float] = defaultdict(float)
    keyword_weights: dict[str, float] = defaultdict(float)

    rated_features = await asyncio.gather(
        *(get_full_movie_features(int(row["movie_id"]), feature_cache) for row in user_rows)
    )

    for row, features in zip(user_rows, rated_features):
        rating = float(row["rating"])
        # Center around user mean and amplify likes/dislikes.
        weight = (rating - avg_rating) * 1.25

        add_weights(genre_weights, features["genres"], weight)
        add_weights(actor_weights, features["actors"], weight)
        add_weight(director_weights, features["director"], weight)
        add_weights(keyword_weights, features["keywords"], weight)

    candidate_ids = await get_candidate_ids(user_rows, rated_set, CANDIDATE_POOL_SIZE)

    candidate_features = await asyncio.gather(
        *(get_full_movie_features(movie_id, feature_cache) for movie_id in candidate_ids)
    )

    scored: list[dict[str, Any]] = []

    for movie_id, features in zip(candidate_ids, candidate_features):
        score = 0.0
        reasons: list[str] = []

        genre_score = sum(genre_weights[g] for g in features["genres"] if g in genre_weights)
        if genre_score != 0:
            score += genre_score * 1.35
            if genre_score > 0:
                reasons.append("genre match")

        actor_score = sum(actor_weights[a] for a in features["actors"] if a in actor_weights)
        if actor_score != 0:
            score += actor_score * 1.1
            if actor_score > 0:
                reasons.append("actor match")

        director_score = director_weights.get(features["director"], 0.0) if features.get("director") else 0.0
        if director_score != 0:
            score += director_score * 1.05
            if director_score > 0:
                reasons.append("director match")

        keyword_score = sum(keyword_weights[k] for k in features["keywords"] if k in keyword_weights)
        if keyword_score != 0:
            score += keyword_score
            if keyword_score > 0:
                reasons.append("keyword match")

        # Quality tie-breaker with low weight so popularity does not dominate.
        vote_average = features.get("vote_average")
        quality_boost = 0.0
        if isinstance(vote_average, (float, int)):
            quality_boost = max(0.0, (float(vote_average) - 6.0) * 0.03)
            score += quality_boost

        positive_score = (
            max(genre_score, 0) * 1.35
            + max(actor_score, 0) * 1.1
            + max(director_score, 0) * 1.05
            + max(keyword_score, 0)
        )

        scored.append(
            {
                "movie_id": movie_id,
                "title": features["title"],
                "year": features["year"],
                "poster_path": features["poster_path"],
                "vote_average": vote_average,
                "score": round(score, 4),
                "positive_score": round(positive_score, 4),
                "positive_signal_count": sum(
                    1
                    for component in (
                        genre_score,
                        actor_score,
                        director_score,
                        keyword_score,
                    )
                    if component > 0
                ),
                "reasons": sorted(set(reasons))[:3],
            }
        )

    scored.sort(key=lambda x: x["score"], reverse=True)

    deduped_scored: list[dict[str, Any]] = []
    seen_scored_ids: set[int] = set()
    for item in scored:
        movie_id = int(item["movie_id"])
        if movie_id in seen_scored_ids:
            continue
        seen_scored_ids.add(movie_id)
        deduped_scored.append(item)

    if len(user_rows) < MIN_RATED_MOVIES:
        filtered = [
            item
            for item in deduped_scored
            if item["positive_signal_count"] > 0 and item["positive_score"] >= 0.05
        ]
    else:
        filtered = [
            item
            for item in deduped_scored
            if item["score"] >= 0.08 and item["positive_signal_count"] > 0
        ]

    return {
        "type": "personalized" if len(user_rows) >= MIN_RATED_MOVIES else "sparse_personalized",
        "rated_movies_count": len(user_rows),
        "recommendations": filtered[:limit],
    }


def verify_internal_token(x_internal_token: str | None) -> None:
    if not ML_INTERNAL_TOKEN:
        raise HTTPException(status_code=500, detail="ML_INTERNAL_TOKEN is not configured")

    if not x_internal_token or x_internal_token != ML_INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized caller")


@app.on_event("startup")
async def on_startup() -> None:
    global pool, http_client, tmdb_semaphore

    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")

    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    http_client = httpx.AsyncClient(timeout=10.0)
    tmdb_semaphore = asyncio.Semaphore(max(1, TMDB_CONCURRENCY))


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global pool, http_client

    if http_client:
        await http_client.aclose()
    if pool:
        await pool.close()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/version")
async def version() -> dict[str, str]:
    return {"service": "cinemind-ml", "version": "1.1.0"}


@app.get("/recommend/{user_id}")
async def recommend(
    user_id: int,
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    x_internal_token: str | None = Header(default=None),
) -> dict[str, Any]:
    verify_internal_token(x_internal_token)

    payload = await score_candidates(user_id, limit)

    return {
        "success": True,
        "user_id": user_id,
        "limit": limit,
        "algorithm": "hybrid_seeded_content_v2",
        **payload,
    }
