import { Pool } from "pg";
import { ENV } from "./env.js";

const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
  ssl: {
    rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== "false",
  },
});

export default pool;
