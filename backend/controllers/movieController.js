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
  if (parsedRating < 0 || parsedRating > 10) {
    return { isValid: false, error: "Rating must be between 0 and 10" };
  }
  return { isValid: true, rating: parsedRating };
}

export async function addMovie(req, res) {
  try {
    const { movie_id, rating } = req.body;
    const userId = req.user.id;

    if (movie_id === null || movie_id === undefined || movie_id === "") {
      return res.status(400).json({ error: "movie_id is required" });
    }

    const ratingValidation = validateRating(rating);
    if (!ratingValidation.isValid) {
      return res.status(400).json({ error: ratingValidation.error });
    }

    const movie = await movieModel.addMovieToLibrary(userId, movie_id, ratingValidation.rating);

    res.status(201).json({ success: true, movie });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add movie" });
  }
}

export async function getLibrary(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseNumber(req.query.limit) ?? 50;
    const offset = parseNumber(req.query.offset) ?? 0;
    const movies = await movieModel.getUserMovies(userId, limit, offset);
    res.json({ success: true, movies });
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

export async function setShowcasePosition(req, res) {
  try {
    const positionNum = parseInt(req.params.position, 10);
    const { movie_id } = req.body;

    if (Number.isNaN(positionNum) || positionNum < 1 || positionNum > 4) {
      return res.status(400).json({ success: false, error: "Position must be 1-4" });
    }

    if (movie_id === null || movie_id === undefined || movie_id === "") {
      return res.status(400).json({ success: false, error: "movie_id is required" });
    }

    const movieCheck = await db.query(
      "SELECT id FROM user_movies WHERE user_id = $1 AND movie_id = $2",
      [req.user.id, movie_id]
    );

    if (movieCheck.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Movie not found in your library. Please rate this movie first." 
      });
    }

    const userMovieId = movieCheck.rows[0].id;

    const existingMovie = await db.query(
      "SELECT position FROM user_profile_showcase WHERE user_id = $1 AND movie_id = $2",
      [req.user.id, userMovieId]
    );

    if (existingMovie.rows.length > 0 && existingMovie.rows[0].position !== positionNum) {
      await db.query(
        "DELETE FROM user_profile_showcase WHERE user_id = $1 AND movie_id = $2",
        [req.user.id, userMovieId]
      );
    }

    const existing = await db.query(
      "SELECT id FROM user_profile_showcase WHERE user_id = $1 AND position = $2",
      [req.user.id, positionNum]
    );

    if (existing.rows.length > 0) {
      await db.query(
        "UPDATE user_profile_showcase SET movie_id = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND position = $3",
        [userMovieId, req.user.id, positionNum]
      );
    } else {
      await db.query(
        "INSERT INTO user_profile_showcase (user_id, position, movie_id) VALUES ($1, $2, $3)",
        [req.user.id, positionNum, userMovieId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Update showcase error:", error);
    res.status(500).json({ success: false, error: "Failed to update showcase" });
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
    const { movie_id, title, year, director, director_id, genres, poster_path, adult } = req.body;

    if (!movie_id || !title) {
      return res.status(400).json({ success: false, error: "movie_id and title are required" });
    }

    await db.query(
      `INSERT INTO movie_cache (movie_id, title, year, director, director_id, genres, poster_path, adult, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT (movie_id) 
       DO UPDATE SET 
         title = EXCLUDED.title,
         year = EXCLUDED.year,
         director = EXCLUDED.director,
         director_id = EXCLUDED.director_id,
         genres = EXCLUDED.genres,
         poster_path = EXCLUDED.poster_path,
         adult = EXCLUDED.adult,
         last_updated = CURRENT_TIMESTAMP`,
      [movie_id, title, year, director, director_id, JSON.stringify(genres), poster_path, adult ?? false]
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
