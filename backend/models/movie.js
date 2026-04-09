import db from "../config/db.js";

// Add movie to library
export async function addMovieToLibrary(userId, movieId, rating, watchedDate = new Date()) {
  const result = await db.query(
    `INSERT INTO user_movies (user_id, movie_id, rating, watched_date)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, movie_id)
     DO UPDATE SET rating = $3, watched_date = $4, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, movieId, rating, watchedDate]
  );
  return result.rows[0];
}

export async function addMoviesToLibraryBulk(userId, movies) {
  if (!Array.isArray(movies) || movies.length === 0) {
    return [];
  }

  const payload = movies.map((movie) => ({
    movie_id: Number(movie.movie_id),
    rating: Number(movie.rating),
    watched_date: movie.watched_date,
  }));

  const result = await db.query(
    `WITH input_rows AS (
       SELECT
         x.movie_id::int AS movie_id,
         x.rating::numeric AS rating,
         x.watched_date::timestamptz AS watched_date
       FROM jsonb_to_recordset($2::jsonb) AS x(movie_id int, rating numeric, watched_date timestamptz)
     )
     INSERT INTO user_movies (user_id, movie_id, rating, watched_date)
     SELECT $1, movie_id, rating, watched_date
     FROM input_rows
     ON CONFLICT (user_id, movie_id)
     DO UPDATE SET
       rating = EXCLUDED.rating,
       watched_date = EXCLUDED.watched_date,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, JSON.stringify(payload)]
  );

  return result.rows;
}

// Get user library
export async function getUserMovies(userId, limit = 50, offset = 0) {
  const [moviesResult, countResult] = await Promise.all([
    db.query(
    `SELECT *
     FROM user_movies
     WHERE user_id = $1
     ORDER BY watched_date DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*)::int AS total
       FROM user_movies
       WHERE user_id = $1`,
      [userId]
    ),
  ]);

  return {
    movies: moviesResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
}

// Update rating
export async function updateMovieRating(userId, movieId, rating) {
  const result = await db.query(
    `UPDATE user_movies SET rating = $3, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND movie_id = $2 RETURNING *`,
    [userId, movieId, rating]
  );
  return result.rows[0];
}

export async function deleteMovieFromLibrary(userId, movieId) {
  const result = await db.query(
    `DELETE FROM user_movies 
     WHERE user_id = $1 AND movie_id = $2 
     RETURNING *`,
    [userId, movieId]
  );
  return result.rows[0];
}
