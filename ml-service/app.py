import json
import os
from collections import defaultdict
from typing import Any

import asyncpg
import httpx
from fastapi import FastAPI, Header, HTTPException, Query

app = FastAPI(title="CineMind ML Recommender", version="1.0.0")

DATABASE_URL = os.getenv("DATABASE_URL")
ML_INTERNAL_TOKEN = os.getenv("ML_INTERNAL_TOKEN")
TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE_URL = "https://api.themoviedb.org/3"

MIN_RATED_MOVIES = int(os.getenv("MIN_RATED_MOVIES", "3"))
DEFAULT_LIMIT = int(os.getenv("DEFAULT_RECOMMENDATION_LIMIT", "30"))
MAX_LIMIT = int(os.getenv("MAX_RECOMMENDATION_LIMIT", "60"))
CANDIDATE_POOL_SIZE = int(os.getenv("CANDIDATE_POOL_SIZE", "300"))
TOP_CAST_COUNT = int(os.getenv("TOP_CAST_COUNT", "5"))

pool: asyncpg.Pool | None = None
http_client: httpx.AsyncClient | None = None


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
        "actors": [],
        "keywords": [],
    }


async def enrich_tmdb_features(base: dict[str, Any]) -> dict[str, Any]:
    if not TMDB_API_KEY:
        return base

    assert http_client is not None
    movie_id = base["movie_id"]

    details_url = f"{TMDB_BASE_URL}/movie/{movie_id}"
    credits_url = f"{TMDB_BASE_URL}/movie/{movie_id}/credits"
    keywords_url = f"{TMDB_BASE_URL}/movie/{movie_id}/keywords"

    params = {"api_key": TMDB_API_KEY, "language": "en-US"}

    try:
        details_res, credits_res, keywords_res = await http_client.get(details_url, params=params), await http_client.get(credits_url, params=params), await http_client.get(keywords_url, params=params)

        if details_res.status_code == 200:
            details_data = details_res.json()
            if not base["title"]:
                base["title"] = details_data.get("title")
            if not base["year"] and details_data.get("release_date"):
                base["year"] = int(details_data["release_date"][:4])
            if not base["poster_path"]:
                base["poster_path"] = details_data.get("poster_path")
            if not base["genres"]:
                base["genres"] = [
                    g.get("name", "").strip().lower()
                    for g in details_data.get("genres", [])
                    if g.get("name")
                ]

        if credits_res.status_code == 200:
            credits_data = credits_res.json()
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

        if keywords_res.status_code == 200:
            keywords_data = keywords_res.json()
            keyword_list = keywords_data.get("keywords", [])
            base["keywords"] = [
                item.get("name", "").strip().lower()
                for item in keyword_list
                if item.get("name")
            ]

    except Exception:
        return base

    return base


async def get_full_movie_features(movie_id: int) -> dict[str, Any]:
    base = await get_movie_cache_features(movie_id)
    return await enrich_tmdb_features(base)


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
        ORDER BY updated_at DESC NULLS LAST
        """,
        user_id,
    )
    return rows


async def get_candidate_ids(exclude_movie_ids: set[int], target_count: int) -> list[int]:
    if not TMDB_API_KEY:
        # Fallback to cached movie ids if TMDB API key is unavailable.
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
    candidates: list[int] = []
    page = 1

    while len(candidates) < target_count and page <= 10:
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

        results = res.json().get("results", [])
        for movie in results:
            movie_id = int(movie.get("id", 0) or 0)
            if movie_id <= 0 or movie_id in exclude_movie_ids:
                continue
            candidates.append(movie_id)
            if len(candidates) >= target_count:
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

    rated_movies = [int(r["movie_id"]) for r in user_rows]
    rated_set = set(rated_movies)
    ratings = [float(r["rating"]) for r in user_rows]
    avg_rating = sum(ratings) / len(ratings)

    genre_weights: dict[str, float] = defaultdict(float)
    actor_weights: dict[str, float] = defaultdict(float)
    director_weights: dict[str, float] = defaultdict(float)
    keyword_weights: dict[str, float] = defaultdict(float)

    for row in user_rows:
        movie_id = int(row["movie_id"])
        rating = float(row["rating"])
        weight = rating - avg_rating

        features = await get_full_movie_features(movie_id)
        add_weights(genre_weights, features["genres"], weight)
        add_weights(actor_weights, features["actors"], weight)
        add_weight(director_weights, features["director"], weight)
        add_weights(keyword_weights, features["keywords"], weight)

    candidate_ids = await get_candidate_ids(rated_set, CANDIDATE_POOL_SIZE)

    scored: list[dict[str, Any]] = []

    for movie_id in candidate_ids:
        features = await get_full_movie_features(movie_id)

        score = 0.0
        reasons: list[str] = []

        genre_score = sum(genre_weights[g] for g in features["genres"] if g in genre_weights)
        if genre_score != 0:
            score += genre_score
            reasons.append("genre match")

        actor_score = sum(actor_weights[a] for a in features["actors"] if a in actor_weights)
        if actor_score != 0:
            score += actor_score
            reasons.append("actor match")

        if features["director"] in director_weights:
            director_score = director_weights[features["director"]]
            score += director_score
            if director_score != 0:
                reasons.append("director match")

        keyword_score = sum(keyword_weights[k] for k in features["keywords"] if k in keyword_weights)
        if keyword_score != 0:
            score += keyword_score
            reasons.append("keyword match")

        scored.append(
            {
                "movie_id": movie_id,
                "title": features["title"],
                "year": features["year"],
                "poster_path": features["poster_path"],
                "score": round(score, 4),
                "reasons": sorted(set(reasons))[:3],
            }
        )

    scored.sort(key=lambda x: x["score"], reverse=True)

    # For users with very few ratings, return top items even if score is 0.
    min_score = 0.0 if len(user_rows) < MIN_RATED_MOVIES else 0.01
    filtered = [item for item in scored if item["score"] >= min_score]

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
    global pool, http_client

    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")

    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    http_client = httpx.AsyncClient(timeout=10.0)


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
    return {"service": "cinemind-ml", "version": "1.0.0"}


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
        "algorithm": "rating_weighted_content",
        **payload,
    }
