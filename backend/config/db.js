import { Pool } from "pg";
import { ENV } from "./env.js";

const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default pool;
