import * as movieModel from "../models/movie.js";
import db from "../config/db.js";

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateRating(rating) {
  const parsedRating = parseNumber(rating);
  if (parsedRating === null) {
    return { isValid: false, error: "Rating is required" };
  }

  if (parsedRating < 0.5 || parsedRating > 5) {
    return { isValid: false, error: "Rating must be between 0.5 and 5" };
  }

  return { isValid: true, rating: parsedRating };
}

export async function addMovie(req, res) {
  try {
    const { movie_id, rating, watched_date } = req.body;
    const userId = req.user.id;

    if (movie_id === null || movie_id === undefined || movie_id === "") {
      return res.status(400).json({ error: "movie_id is required" });
    }

    const ratingValidation = validateRating(rating);
    if (!ratingValidation.isValid) {
      return res.status(400).json({ error: ratingValidation.error });
    }

    let watchedDate = new Date();
    if (watched_date !== null && watched_date !== undefined && watched_date !== "") {
      watchedDate = new Date(watched_date);
      if (Number.isNaN(watchedDate.getTime())) {
        return res.status(400).json({ error: "watched_date must be a valid date" });
      }
    }

    const movie = await movieModel.addMovieToLibrary(
      userId,
      movie_id,
      ratingValidation.rating,
      watchedDate
    );

    res.status(201).json({ success: true, movie });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add movie" });
  }
}

export async function addMoviesBulk(req, res) {
  try {
    const userId = req.user.id;
    const incomingMovies = Array.isArray(req.body?.movies) ? req.body.movies : [];

    if (incomingMovies.length === 0) {
      return res.status(400).json({ error: "movies array is required" });
    }

    if (incomingMovies.length > 2000) {
      return res.status(400).json({ error: "Maximum 2000 movies per request" });
    }

    const sanitizedMovies = [];

    for (const movie of incomingMovies) {
      const movieId = parseNumber(movie?.movie_id);
      if (movieId === null || !Number.isInteger(movieId) || movieId <= 0) {
        continue;
      }

      const ratingValidation = validateRating(movie?.rating);
      if (!ratingValidation.isValid) {
        continue;
      }

      let watchedDate = new Date();
      if (movie?.watched_date !== null && movie?.watched_date !== undefined && movie?.watched_date !== "") {
        watchedDate = new Date(movie.watched_date);
        if (Number.isNaN(watchedDate.getTime())) {
          continue;
        }
      }

      sanitizedMovies.push({
        movie_id: movieId,
        rating: ratingValidation.rating,
        watched_date: watchedDate.toISOString(),
      });
    }

    if (sanitizedMovies.length === 0) {
      return res.status(400).json({ error: "No valid movie rows found in request" });
    }

    const rows = await movieModel.addMoviesToLibraryBulk(userId, sanitizedMovies);

    return res.status(201).json({
      success: true,
      imported: rows.length,
      skipped: incomingMovies.length - sanitizedMovies.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to bulk import movies" });
  }
}

export async function getLibrary(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseNumber(req.query.limit) ?? 50;
    const offset = parseNumber(req.query.offset) ?? 0;
    const libraryResult = await movieModel.getUserMovies(userId, limit, offset);
    res.json({
      success: true,
      movies: libraryResult.movies,
      total: libraryResult.total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get library" });
  }
}

export async function updateRating(req, res) {
  try {
    const { movieId } = req.params;
    const { rating } = req.body;
    const userId = req.user.id;

    const ratingValidation = validateRating(rating);
    if (!ratingValidation.isValid) {
      return res.status(400).json({ error: ratingValidation.error });
    }

    const updated = await movieModel.updateMovieRating(userId, movieId, ratingValidation.rating);

    if (!updated) return res.status(404).json({ error: "Movie not found" });
    res.json({ success: true, movie: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update rating" });
  }
}

export async function deleteMovie(req, res) {
  try {
    const { movieId } = req.params;
    const userId = req.user.id;

    const deleted = await movieModel.deleteMovieFromLibrary(userId, movieId);

    if (!deleted) {
      return res.status(404).json({ error: "Movie not found" });
    }
    
    res.json({ success: true, message: "Movie deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete movie" });
  }
}

export async function getShowcase(req, res) {
  try {
    const result = await db.query(
      `SELECT ups.position, um.movie_id, ups.updated_at 
       FROM user_profile_showcase ups
       JOIN user_movies um ON ups.movie_id = um.id
       WHERE ups.user_id = $1 
       ORDER BY ups.position`,
      [req.user.id]
    );

    res.json({ success: true, showcase: result.rows });
  } catch (error) {
    console.error("Get showcase error:", error);
    res.status(500).json({ success: false, error: "Failed to get showcase" });
  }
}

export async function getProfileBootstrap(req, res) {
  try {
    const libraryResult = await db.query(
      `WITH latest_cache AS (
         SELECT DISTINCT ON (movie_id)
           movie_id,
           title,
           year,
           director,
           director_id,
           genres,
           poster_path
         FROM movie_cache
         WHERE last_updated > NOW() - INTERVAL '7 days'
         ORDER BY movie_id, last_updated DESC
       )
       SELECT
         um.movie_id,
         um.rating,
         um.watched_date,
         um.updated_at,
         lc.title,
         lc.year,
         lc.director,
         lc.director_id,
         lc.genres,
         lc.poster_path
       FROM user_movies um
       LEFT JOIN latest_cache lc
         ON lc.movie_id = um.movie_id
       WHERE um.user_id = $1
       ORDER BY um.watched_date DESC`,
      [req.user.id]
    );

    const showcaseResult = await db.query(
      `SELECT ups.position, um.movie_id
       FROM user_profile_showcase ups
       JOIN user_movies um ON ups.movie_id = um.id
       WHERE ups.user_id = $1
       ORDER BY ups.position`,
      [req.user.id]
    );

    const movies = libraryResult.rows.map((row) => ({
      movie_id: row.movie_id,
      rating: row.rating,
      watched_date: row.watched_date,
      updated_at: row.updated_at,
      title: row.title,
      year: row.year,
      director: row.director,
      director_id: row.director_id,
      genres: row.genres,
      poster_path: row.poster_path,
    }));

    const showcase = showcaseResult.rows;

    res.json({ success: true, movies, showcase });
  } catch (error) {
    console.error("Get profile bootstrap error:", error);
    res.status(500).json({ success: false, error: "Failed to get profile bootstrap data" });
  }
}

export async function getProfileStats(req, res) {
  try {
    const result = await db.query(
      `WITH overall_stats AS (
         SELECT
           COUNT(DISTINCT um.movie_id)::int AS films_watched,
           COUNT(DISTINCT um.movie_id) FILTER (
             WHERE EXTRACT(YEAR FROM um.watched_date) = EXTRACT(YEAR FROM CURRENT_DATE)
           )::int AS this_year,
           COALESCE(ROUND(AVG(um.rating)::numeric, 1), 0) AS avg_rating
         FROM user_movies um
         WHERE um.user_id = $1
       ),
       director_stats AS (
         SELECT
           mc.director,
           COUNT(*)::int AS movies_watched,
           ROUND(AVG(um.rating)::numeric, 2) AS avg_director_rating,
           (ROUND(AVG(um.rating)::numeric, 2) * 100 + COUNT(*))::numeric AS weighted_score
         FROM user_movies um
         JOIN movie_cache mc ON mc.movie_id = um.movie_id
         WHERE um.user_id = $1
           AND mc.director IS NOT NULL
           AND TRIM(mc.director) <> ''
         GROUP BY mc.director
         HAVING COUNT(*) >= 2
       ),
       favorite_director AS (
         SELECT
           director,
           movies_watched,
           avg_director_rating
         FROM director_stats
         ORDER BY weighted_score DESC, avg_director_rating DESC, movies_watched DESC, director ASC
         LIMIT 1
       )
       SELECT
         os.films_watched,
         os.this_year,
         os.avg_rating,
         fd.director AS favorite_director,
         fd.movies_watched AS favorite_director_movies_watched,
         fd.avg_director_rating AS favorite_director_avg_rating
       FROM overall_stats os
       LEFT JOIN favorite_director fd ON true`,
      [req.user.id]
    );

    const row = result.rows[0] || {};
    res.json({
      success: true,
      stats: {
        filmsWatched: Number(row.films_watched || 0),
        thisYear: Number(row.this_year || 0),
        avgRating: Number(row.avg_rating || 0),
        favoriteDirector: row.favorite_director || null,
        favoriteDirectorMoviesWatched: Number(row.favorite_director_movies_watched || 0),
        favoriteDirectorAvgRating: Number(row.favorite_director_avg_rating || 0),
      },
    });
  } catch (error) {
    console.error("Get profile stats error:", error);
    res.status(500).json({ success: false, error: "Failed to get profile stats" });
  }
}

export async function setShowcasePosition(req, res) {
  const client = await db.connect();
  let transactionStarted = false;

  try {
    const positionNum = parseInt(req.params.position, 10);
    const { movie_id } = req.body;

    if (Number.isNaN(positionNum) || positionNum < 1 || positionNum > 4) {
      return res.status(400).json({ success: false, error: "Position must be 1-4" });
    }

    if (movie_id === null || movie_id === undefined || movie_id === "") {
      return res.status(400).json({ success: false, error: "movie_id is required" });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const movieCheck = await client.query(
      "SELECT id FROM user_movies WHERE user_id = $1 AND movie_id = $2",
      [req.user.id, movie_id]
    );

    if (movieCheck.rows.length === 0) {
      if (transactionStarted) {
        await client.query("ROLLBACK");
        transactionStarted = false;
      }
      return res.status(400).json({
        success: false,
        error: "Movie not found in your library. Please rate this movie first.",
      });
    }

    const userMovieId = movieCheck.rows[0].id;

    const existingMovie = await client.query(
      "SELECT position FROM user_profile_showcase WHERE user_id = $1 AND movie_id = $2",
      [req.user.id, userMovieId]
    );

    if (existingMovie.rows.length > 0 && existingMovie.rows[0].position !== positionNum) {
      await client.query(
        "DELETE FROM user_profile_showcase WHERE user_id = $1 AND movie_id = $2",
        [req.user.id, userMovieId]
      );
    }

    const existing = await client.query(
      "SELECT id FROM user_profile_showcase WHERE user_id = $1 AND position = $2",
      [req.user.id, positionNum]
    );

    if (existing.rows.length > 0) {
      await client.query(
        "UPDATE user_profile_showcase SET movie_id = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND position = $3",
        [userMovieId, req.user.id, positionNum]
      );
    } else {
      await client.query(
        "INSERT INTO user_profile_showcase (user_id, position, movie_id) VALUES ($1, $2, $3)",
        [req.user.id, positionNum, userMovieId]
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    res.json({ success: true });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    console.error("Update showcase error:", error);
    res.status(500).json({ success: false, error: "Failed to update showcase" });
  } finally {
    client.release();
  }
}


export async function deleteShowcasePosition(req, res) {
  try {
    const { position } = req.params;

    await db.query(
      "DELETE FROM user_profile_showcase WHERE user_id = $1 AND position = $2",
      [req.user.id, position]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Delete showcase error:", error);
    res.status(500).json({ success: false, error: "Failed to remove from showcase" });
  }
}

export async function getWatchlist(req, res) {
  try {
    const result = await db.query(
      `SELECT movie_id, added_at 
       FROM user_watchlist 
       WHERE user_id = $1 
       ORDER BY added_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, watchlist: result.rows });
  } catch (error) {
    console.error("Get watchlist error:", error);
    res.status(500).json({ success: false, error: "Failed to get watchlist" });
  }
}

export async function addToWatchlist(req, res) {
  try {
    const { movie_id } = req.body;

    if (movie_id === null || movie_id === undefined || movie_id === "") {
      return res.status(400).json({ success: false, error: "movie_id is required" });
    }

    const existing = await db.query(
      "SELECT id FROM user_watchlist WHERE user_id = $1 AND movie_id = $2",
      [req.user.id, movie_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: "Movie already in watchlist" });
    }

    await db.query(
      "INSERT INTO user_watchlist (user_id, movie_id) VALUES ($1, $2)",
      [req.user.id, movie_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Add to watchlist error:", error);
    res.status(500).json({ success: false, error: "Failed to add to watchlist" });
  }
}

export async function removeFromWatchlist(req, res) {
  try {
    const { movieId } = req.params;

    await db.query(
      "DELETE FROM user_watchlist WHERE user_id = $1 AND movie_id = $2",
      [req.user.id, movieId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Remove from watchlist error:", error);
    res.status(500).json({ success: false, error: "Failed to remove from watchlist" });
  }
}

export async function checkWatchlist(req, res) {
  try {
    const { movieId } = req.params;

    const result = await db.query(
      "SELECT id FROM user_watchlist WHERE user_id = $1 AND movie_id = $2",
      [req.user.id, movieId]
    );

    res.json({ success: true, inWatchlist: result.rows.length > 0 });
  } catch (error) {
    console.error("Check watchlist error:", error);
    res.status(500).json({ success: false, error: "Failed to check watchlist" });
  }
}

export async function getCachedMovie(req, res) {
  try {
    const { movieId } = req.params;

    const result = await db.query(
      `SELECT * FROM movie_cache 
       WHERE movie_id = $1 
       AND last_updated > NOW() - INTERVAL '7 days'`,
      [movieId]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, cached: true, movie: result.rows[0] });
    } else {
      res.json({ success: true, cached: false });
    }
  } catch (error) {
    console.error("Get cache error:", error);
    res.status(500).json({ success: false, error: "Failed to get cache" });
  }
}

export async function cacheMovie(req, res) {
  try {
    const { movie_id, title, year, director, director_id, genres, poster_path } = req.body;

    if (!movie_id || !title) {
      return res.status(400).json({ success: false, error: "movie_id and title are required" });
    }

    await db.query(
      `INSERT INTO movie_cache (movie_id, title, year, director, director_id, genres, poster_path, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (movie_id) 
       DO UPDATE SET 
         title = COALESCE(NULLIF(BTRIM(EXCLUDED.title), ''), movie_cache.title),
         year = COALESCE(EXCLUDED.year, movie_cache.year),
         director = COALESCE(NULLIF(BTRIM(EXCLUDED.director), ''), movie_cache.director),
         director_id = COALESCE(EXCLUDED.director_id, movie_cache.director_id),
         genres = CASE
           WHEN EXCLUDED.genres IS NULL OR EXCLUDED.genres = '[]'::jsonb THEN movie_cache.genres
           ELSE EXCLUDED.genres
         END,
         poster_path = COALESCE(NULLIF(BTRIM(EXCLUDED.poster_path), ''), movie_cache.poster_path),
         last_updated = CURRENT_TIMESTAMP`,
      [movie_id, title, year, director, director_id, JSON.stringify(genres), poster_path]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Cache movie error:", error);
    res.status(500).json({ success: false, error: "Failed to cache movie" });
  }
}

export async function getCachedMovies(req, res) {
  try {
    const { movie_ids } = req.body;

    if (!Array.isArray(movie_ids) || movie_ids.length === 0) {
      return res.json({ success: true, movies: [] });
    }

    const result = await db.query(
      `SELECT * FROM movie_cache 
       WHERE movie_id = ANY($1::int[])
       AND last_updated > NOW() - INTERVAL '7 days'`,
      [movie_ids]
    );

    res.json({ success: true, movies: result.rows });
  } catch (error) {
    console.error("Bulk cache error:", error);
    res.status(500).json({ success: false, error: "Failed to get cached movies" });
  }
}

export async function cacheMoviesBulk(req, res) {
  try {
    const incomingMovies = Array.isArray(req.body?.movies) ? req.body.movies : [];

    if (incomingMovies.length === 0) {
      return res.json({ success: true, cached: 0 });
    }

    const sanitizedMovies = incomingMovies
      .map((movie) => ({
        movie_id: parseNumber(movie?.movie_id),
        title: typeof movie?.title === "string" ? movie.title.trim() : "",
        year: parseNumber(movie?.year),
        director: typeof movie?.director === "string" ? movie.director.trim() : null,
        director_id: parseNumber(movie?.director_id),
        genres: Array.isArray(movie?.genres) ? movie.genres : [],
        poster_path: movie?.poster_path || null,
      }))
      .filter((movie) => Number.isInteger(movie.movie_id) && movie.movie_id > 0 && movie.title);

    if (sanitizedMovies.length === 0) {
      return res.json({ success: true, cached: 0 });
    }

    await db.query(
      `INSERT INTO movie_cache (movie_id, title, year, director, director_id, genres, poster_path, last_updated)
       SELECT
         x.movie_id::int,
         x.title::text,
         x.year::int,
         x.director::text,
         x.director_id::int,
         x.genres::jsonb,
         x.poster_path::text,
         CURRENT_TIMESTAMP
       FROM jsonb_to_recordset($1::jsonb) AS x(
         movie_id int,
         title text,
         year int,
         director text,
         director_id int,
         genres jsonb,
         poster_path text
       )
       ON CONFLICT (movie_id)
       DO UPDATE SET
         title = COALESCE(NULLIF(BTRIM(EXCLUDED.title), ''), movie_cache.title),
         year = COALESCE(EXCLUDED.year, movie_cache.year),
         director = COALESCE(NULLIF(BTRIM(EXCLUDED.director), ''), movie_cache.director),
         director_id = COALESCE(EXCLUDED.director_id, movie_cache.director_id),
         genres = CASE
           WHEN EXCLUDED.genres IS NULL OR EXCLUDED.genres = '[]'::jsonb THEN movie_cache.genres
           ELSE EXCLUDED.genres
         END,
         poster_path = COALESCE(NULLIF(BTRIM(EXCLUDED.poster_path), ''), movie_cache.poster_path),
         last_updated = CURRENT_TIMESTAMP`,
      [JSON.stringify(sanitizedMovies)]
    );

    return res.json({ success: true, cached: sanitizedMovies.length });
  } catch (error) {
    console.error("Bulk cache write error:", error);
    return res.status(500).json({ success: false, error: "Failed to cache movies in bulk" });
  }
}

export async function cleanupCache(req, res) {
  try {
    const result = await db.query(
      `DELETE FROM movie_cache 
       WHERE last_updated < NOW() - INTERVAL '7 days'`
    );

    res.json({ success: true, deleted: result.rowCount });
  } catch (error) {
    console.error("Cache cleanup error:", error);
    res.status(500).json({ success: false, error: "Failed to cleanup cache" });
  }
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function normalizeCachedGenres(genresValue) {
  if (!genresValue) return [];
  if (Array.isArray(genresValue)) return genresValue;

  if (typeof genresValue === "string") {
    try {
      const parsed = JSON.parse(genresValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return genresValue.split(",").map(item => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function normalizePosterPath(posterPath) {
  if (!posterPath) return null;
  if (String(posterPath).startsWith("http")) return posterPath;
  return `https://image.tmdb.org/t/p/w500${posterPath}`;
}

function normalizeYearFromReleaseDate(releaseDate) {
  if (!releaseDate || typeof releaseDate !== "string") return null;
  const year = parseNumber(releaseDate.slice(0, 4));
  return year && year > 1800 ? year : null;
}

async function fetchTmdbRecommendationDetails(movieIds) {
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey || !Array.isArray(movieIds) || movieIds.length === 0) {
    return new Map();
  }

  const detailsByMovieId = new Map();

  await Promise.all(
    movieIds.map(async (movieId) => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}?api_key=${tmdbApiKey}&language=en-US&append_to_response=credits`
        );

        if (!response.ok) return;

        const data = await response.json();
        const director = Array.isArray(data?.credits?.crew)
          ? data.credits.crew.find((person) => person?.job === "Director")
          : null;

        detailsByMovieId.set(movieId, {
          title: data?.title || null,
          year: normalizeYearFromReleaseDate(data?.release_date),
          poster_path: data?.poster_path || null,
          director: director?.name || null,
          director_id: parseNumber(director?.id),
          genres: Array.isArray(data?.genres)
            ? data.genres.map((genre) => genre?.name).filter(Boolean)
            : [],
          vote_average: parseNumber(data?.vote_average),
        });
      } catch {
        // Ignore TMDB detail misses and fall back to available data.
      }
    })
  );

  return detailsByMovieId;
}

function clampRatingToFiveScale(value) {
  const parsed = parseNumber(value);
  if (parsed === null) return null;

  // TMDB ratings are on a 0-10 scale; UI uses 0-5 stars.
  const normalized = parsed > 5 ? parsed / 2 : parsed;
  return Math.max(0, Math.min(5, Number(normalized.toFixed(1))));
}

export async function getRecommendations(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseNumber(req.query.limit) ?? 30;
    const refresh = parseBoolean(req.query.refresh, false);

    const mlServiceUrl = process.env.ML_SERVICE_URL;
    const mlInternalToken = process.env.ML_INTERNAL_TOKEN;

    if (!mlServiceUrl || !mlInternalToken) {
      return res.status(500).json({
        success: false,
        error: "ML service is not configured on backend",
      });
    }

    const endpoint = `${mlServiceUrl.replace(/\/$/, "")}/recommend/${userId}?limit=${limit}`;
    const mlResponse = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": mlInternalToken,
      },
    });

    if (!mlResponse.ok) {
      const rawError = await mlResponse.text();
      return res.status(502).json({
        success: false,
        error: "Failed to fetch recommendations from ML service",
        details: rawError,
      });
    }

    const payload = await mlResponse.json();
    const recommendations = Array.isArray(payload.recommendations) ? payload.recommendations : [];
    const movieIds = recommendations.map(item => parseNumber(item.movie_id)).filter(Boolean);

    let cacheByMovieId = new Map();

    if (movieIds.length > 0) {
      const cacheResult = await db.query(
        `SELECT movie_id, title, year, director, director_id, genres, poster_path
         FROM movie_cache
         WHERE movie_id = ANY($1::int[])`,
        [movieIds]
      );

      cacheByMovieId = new Map(cacheResult.rows.map(row => [Number(row.movie_id), row]));
    }

    const movieIdsMissingMetadata = movieIds.filter((movieId) => {
      const cached = cacheByMovieId.get(movieId);
      if (!cached) return true;

      const cachedGenres = normalizeCachedGenres(cached.genres);
      return !cached.title || !cached.year || !cached.poster_path || !cached.director || !cached.director_id || cachedGenres.length === 0;
    });

    const tmdbDetailsByMovieId = await fetchTmdbRecommendationDetails(movieIdsMissingMetadata);

    const seenMovieIds = new Set();
    const hydratedRecommendations = [];

    for (const item of recommendations) {
      const movieId = parseNumber(item.movie_id);
      if (!movieId || seenMovieIds.has(movieId)) {
        continue;
      }

      seenMovieIds.add(movieId);

      const cached = cacheByMovieId.get(movieId) || null;
      const genres = normalizeCachedGenres(cached?.genres);
      const tmdb = tmdbDetailsByMovieId.get(movieId) || null;
      const score = parseNumber(item.score);
      const voteAverage = parseNumber(item.vote_average) ?? tmdb?.vote_average ?? null;

      hydratedRecommendations.push({
        id: movieId,
        rank: hydratedRecommendations.length + 1,
        score,
        matchScore: score,
        rating: clampRatingToFiveScale(voteAverage),
        title: cached?.title || tmdb?.title || item.title || `TMDB ${movieId}`,
        year: cached?.year || tmdb?.year || item.year || null,
        poster: normalizePosterPath(cached?.poster_path || tmdb?.poster_path || item.poster_path),
        director: cached?.director || tmdb?.director || null,
        directorId: cached?.director_id || tmdb?.director_id || null,
        genres: genres.length > 0 ? genres : (tmdb?.genres || []),
        reasons: Array.isArray(item.reasons) ? item.reasons : [],
      });
    }

    res.json({
      success: true,
      type: payload.type || "personalized",
      refresh,
      rated_movies_count: payload.rated_movies_count ?? null,
      recommendations: hydratedRecommendations,
    });
  } catch (error) {
    console.error("Get recommendations error:", error);
    res.status(500).json({ success: false, error: "Failed to get recommendations" });
  }
}
