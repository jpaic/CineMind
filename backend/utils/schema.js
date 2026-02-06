import db from "../config/db.js";

export async function ensureSchema() {
  await db.query(
    `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS adult_content_enabled BOOLEAN DEFAULT false`
  );

  await db.query(
    `ALTER TABLE movie_cache
     ADD COLUMN IF NOT EXISTS adult BOOLEAN DEFAULT false`
  );
}
