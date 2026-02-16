import db from "../config/db.js";

export async function createUser(email, username, passwordHash) {
  const result = await db.query(
    `INSERT INTO users (email, username, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, username, created_at`,
    [email, username, passwordHash]
  );

  return result.rows[0];
}

export async function getUserByEmail(email) {
  const result = await db.query(
    "SELECT id, email, username, password_hash, created_at FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0];
}

export async function getUserByUsername(username) {
  const result = await db.query(
    "SELECT id, email, username, password_hash, created_at FROM users WHERE username = $1",
    [username]
  );
  return result.rows[0];
}

export async function getUserById(userId) {
  const result = await db.query(
    "SELECT id, email, username, password_hash, created_at FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0];
}

export async function updateUserPassword(userId, passwordHash) {
  const result = await db.query(
    `UPDATE users
     SET password_hash = $2
     WHERE id = $1
     RETURNING id, email, username, created_at`,
    [userId, passwordHash]
  );

  return result.rows[0];
}

export async function deleteUserById(userId) {
  const result = await db.query(
    "DELETE FROM users WHERE id = $1 RETURNING id",
    [userId]
  );

  return result.rows[0];
}
