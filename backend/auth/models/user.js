import db from "../config/db.js";

export async function createUser(email, username, passwordHash) {
  const result = await db.query(
    `INSERT INTO users (email, username, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, created_at`,
    [email, username, passwordHash]
  );

  return result.rows[0];
}

export async function getUserByEmail(email) {
  const result = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0];
}

export async function getUserByUsername(username) {
  const result = await db.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );
  return result.rows[0];
}
