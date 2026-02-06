import db from "../config/db.js";

export async function createUser(email, username, passwordHash) {
  const result = await db.query(
    `INSERT INTO users (email, username, password_hash, adult_content_enabled)
     VALUES ($1, $2, $3, false)
     RETURNING id, email, username, created_at, adult_content_enabled`,
    [email, username, passwordHash]
  );

  return result.rows[0];
}

export async function getUserByEmail(email) {
  const result = await db.query(
    "SELECT id, email, username, password_hash, created_at, adult_content_enabled FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0];
}

export async function getUserByUsername(username) {
  const result = await db.query(
    "SELECT id, email, username, password_hash, created_at, adult_content_enabled FROM users WHERE username = $1",
    [username]
  );
  return result.rows[0];
}

export async function getUserSettings(userId) {
  const result = await db.query(
    "SELECT adult_content_enabled FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0];
}

export async function updateAdultContentSetting(userId, enabled) {
  const result = await db.query(
    "UPDATE users SET adult_content_enabled = $2 WHERE id = $1 RETURNING adult_content_enabled",
    [userId, enabled]
  );
  return result.rows[0];
}
