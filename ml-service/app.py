import json
import math
import os
from collections import defaultdict
from datetime import datetime, timezone
from statistics import mean, stdev
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
RATING_HALF_LIFE_DAYS = int(os.getenv("RATING_HALF_LIFE_DAYS", "730"))
RANKING_GLOBAL_MEAN = float(os.getenv("RANKING_GLOBAL_MEAN", "6.5"))
RANKING_MIN_VOTES = int(os.getenv("RANKING_MIN_VOTES", "500"))

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


def compute_recency_factor(updated_at: datetime | None, half_life_days: int = RATING_HALF_LIFE_DAYS) -> float:
    if updated_at is None:
        return 0.5

    ref = updated_at if updated_at.tzinfo else updated_at.replace(tzinfo=timezone.utc)
    days_elapsed = max(0, (datetime.now(timezone.utc) - ref).days)
    return math.exp(-days_elapsed / max(1, half_life_days))


def bayesian_average(vote_average: float, vote_count: int, m: int = RANKING_MIN_VOTES, c: float = RANKING_GLOBAL_MEAN) -> float:
    return (vote_count * vote_average + m * c) / (vote_count + m)


async def get_movie_cache_features(movie_id: int) -> dict[str, Any]:
    assert pool is not None

    try:
        row = await pool.fetchrow(
            """
            SELECT movie_id, title, year, director, genres, poster_path, vote_average, vote_count, tmdb_popularity
            FROM movie_cache
            WHERE movie_id = $1
            """,
            movie_id,
        )
    except asyncpg.exceptions.UndefinedColumnError:
        row = await pool.fetchrow(
            """
            SELECT movie_id, title, year, director, genres, poster_path, vote_average
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
            "vote_count": None,
            "tmdb_popularity": None,
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
        "vote_count": None,
        "tmdb_popularity": None,
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
        if details_data.get("vote_count") is not None:
            try:
                base["vote_count"] = int(details_data["vote_count"])
            except (TypeError, ValueError):
                pass
        if details_data.get("popularity") is not None:
            try:
                base["tmdb_popularity"] = float(details_data["popularity"])
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
    has_rating = isinstance(base.get("vote_average"), (float, int))
    # Even if structural metadata exists in cache, we still need a rating for
    # recommendation cards. Pull TMDB details when vote_average is missing.
    features = base if has_strong_cache and has_rating else await enrich_tmdb_features(base)
    cache[movie_id] = features
    return features


def add_weight(bucket: dict[str, float], key: str | None, value: float) -> None:
    if key and key.strip():
        bucket[key.strip().lower()] += value


def add_weights(bucket: dict[str, float], keys: list[str], value: float) -> None:
    for key in keys:
        add_weight(bucket, key, value)


def decade_start(year: int | None) -> int | None:
    if not isinstance(year, int):
        return None
    if year < 1880:
        return None
    return (year // 10) * 10


MIN_DECADE_SHARE_FOR_OLDEST = float(os.getenv("MIN_DECADE_SHARE_FOR_OLDEST", "0.05"))


def get_candidate_year_window(
    rated_features: list[dict[str, Any]],
    total_rated_movies: int,
) -> tuple[int, int] | None:
    decade_counts: dict[int, int] = defaultdict(int)
    for features in rated_features:
        decade = decade_start(features.get("year"))
        if decade is not None:
            decade_counts[decade] += 1

    rated_decades = sorted(decade_counts.keys())

    if not rated_decades:
        return None

    denominator = max(1, total_rated_movies)
    min_decade = rated_decades[0]
    for decade in rated_decades:
        share = decade_counts[decade] / denominator
        if share >= MIN_DECADE_SHARE_FOR_OLDEST:
            min_decade = decade
            break

    # Keep recommendations near the user's taste era and avoid very old decades.
    max_decade = rated_decades[-1]

    min_year = min_decade - 20
    max_year = (max_decade + 10) + 9
    return (min_year, max_year)


async def get_user_ratings(user_id: int) -> list[asyncpg.Record]:
    assert pool is not None
    rows = await pool.fetch(
        """
        SELECT movie_id, rating, updated_at
        FROM user_movies
        WHERE user_id = $1
        ORDER BY updated_at DESC NULLS LAST, rating DESC
        """,
        user_id,
    )
    return rows


def decade_alignment_bonus(movie_year: int | None, decade_distribution: dict[int, int]) -> float:
    decade = decade_start(movie_year)
    if decade is None:
        return 0.0
    total = sum(decade_distribution.values()) or 1
    return (decade_distribution.get(decade, 0) / total) * 0.1


async def get_editorial_recommendations(limit: int) -> dict[str, Any]:
    assert pool is not None
    try:
        rows = await pool.fetch(
            """
            SELECT movie_id, title, year, poster_path, vote_average
            FROM movie_cache
            WHERE vote_average >= 7.5
            ORDER BY vote_average DESC, year DESC NULLS LAST
            LIMIT $1
            """,
            max(limit * 3, 30),
        )
    except asyncpg.exceptions.UndefinedColumnError:
        rows = await pool.fetch(
            """
            SELECT movie_id, title, year, poster_path
            FROM movie_cache
            ORDER BY year DESC NULLS LAST, last_updated DESC NULLS LAST
            LIMIT $1
            """,
            max(limit * 3, 30),
        )
    return {
        "type": "editorial",
        "rated_movies_count": 0,
        "recommendations": [
            {
                "movie_id": int(r["movie_id"]),
                "title": r["title"],
                "year": r["year"],
                "poster_path": r["poster_path"],
                "vote_average": float(r["vote_average"]) if "vote_average" in r and r["vote_average"] is not None else None,
                "score": None,
                "reasons": ["editorial pick"],
            }
            for r in rows[:limit]
        ],
    }


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
        return await get_editorial_recommendations(limit)

    feature_cache: dict[int, dict[str, Any]] = {}

    rated_movies = [int(r["movie_id"]) for r in user_rows]
    rated_set = set(rated_movies)
    ratings = [float(r["rating"]) for r in user_rows]
    avg_rating = mean(ratings)
    std_rating = stdev(ratings) if len(ratings) > 1 else 1.0

    genre_weights: dict[str, float] = defaultdict(float)
    actor_weights: dict[str, float] = defaultdict(float)
    director_weights: dict[str, float] = defaultdict(float)
    keyword_weights: dict[str, float] = defaultdict(float)

    rated_features = await asyncio.gather(
        *(get_full_movie_features(int(row["movie_id"]), feature_cache) for row in user_rows)
    )
    candidate_year_window = get_candidate_year_window(rated_features, len(user_rows))
    decade_distribution: dict[int, int] = defaultdict(int)

    for row, features in zip(user_rows, rated_features):
        rating = float(row["rating"])
        recency = compute_recency_factor(row["updated_at"])
        z_score = (rating - avg_rating) / (std_rating or 1.0)
        weight = z_score * recency

        add_weights(genre_weights, features["genres"], weight)
        add_weights(actor_weights, features["actors"], weight)
        add_weight(director_weights, features["director"], weight)
        add_weights(keyword_weights, features["keywords"], weight)
        if rating >= avg_rating:
            decade = decade_start(features.get("year"))
            if decade is not None:
                decade_distribution[decade] += 1

    candidate_ids = await get_candidate_ids(user_rows, rated_set, CANDIDATE_POOL_SIZE)

    candidate_features = await asyncio.gather(
        *(get_full_movie_features(movie_id, feature_cache) for movie_id in candidate_ids)
    )

    scored: list[dict[str, Any]] = []

    for movie_id, features in zip(candidate_ids, candidate_features):
        if candidate_year_window and isinstance(features.get("year"), int):
            min_year, max_year = candidate_year_window
            if features["year"] < min_year or features["year"] > max_year:
                continue

        score = 0.0
        reasons: list[str] = []

        genre_raw = sum(genre_weights[g] for g in features["genres"] if g in genre_weights)
        genre_score = genre_raw / math.sqrt(max(len(features["genres"]), 1))
        if genre_score != 0:
            if genre_score > 0:
                reasons.append("genre match")

        actor_raw = sum(actor_weights[a] for a in features["actors"][:3] if a in actor_weights)
        actor_score = actor_raw / 3.0
        if actor_score != 0:
            if actor_score > 0:
                reasons.append("actor match")

        director_score = director_weights.get(features["director"], 0.0) if features.get("director") else 0.0
        if director_score != 0:
            if director_score > 0:
                reasons.append("director match")

        keyword_raw = sum(keyword_weights[k] for k in features["keywords"][:10] if k in keyword_weights)
        keyword_score = keyword_raw / 10.0
        if keyword_score != 0:
            if keyword_score > 0:
                reasons.append("keyword match")

        vote_average = features.get("vote_average")
        vote_count = features.get("vote_count")
        tmdb_popularity = features.get("tmdb_popularity")
        quality_boost = 0.0
        if isinstance(vote_average, (float, int)) and isinstance(vote_count, int) and vote_count > 0:
            quality_boost = (bayesian_average(float(vote_average), vote_count) - 5.0) / 5.0
        novelty_boost = 0.0
        if isinstance(tmdb_popularity, (float, int)):
            novelty_boost = max(0.0, 1.0 - math.log1p(float(tmdb_popularity)) / 10.0)
        decade_bonus = decade_alignment_bonus(features.get("year"), decade_distribution)

        affinity_score = (
            genre_score * 0.40
            + director_score * 0.30
            + actor_score * 0.20
            + keyword_score * 0.10
        )
        score = affinity_score * 0.60 + quality_boost * 0.25 + novelty_boost * 0.05 + decade_bonus

        positive_score = (
            max(genre_score, 0)
            + max(actor_score, 0)
            + max(director_score, 0)
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
                "affinity_score": round(affinity_score, 4),
                "quality_score": round(quality_boost, 4),
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
                "sources": ["content_based"],
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
        "computed_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
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
        "algorithm_version": "2.0.0",
        **payload,
    }
