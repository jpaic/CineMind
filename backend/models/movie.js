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

// Get user library
export async function getUserMovies(userId, limit = 50, offset = 0) {
  const result = await db.query(
    `SELECT *
     FROM user_movies
     WHERE user_id = $1
     ORDER BY watched_date DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
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
