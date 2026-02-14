import dotenv from "dotenv";

dotenv.config();

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || String(value).trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getBooleanEnv(name, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  return String(value).toLowerCase() === "true";
}

export const ENV = {
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),
  JWT_SECRET: getRequiredEnv("JWT_SECRET"),
  JWT_EXPIRY: getRequiredEnv("JWT_EXPIRY"),
  CACHE_WRITE_SECRET: getRequiredEnv("CACHE_WRITE_SECRET"),
  DB_SSL_REJECT_UNAUTHORIZED: getBooleanEnv("DB_SSL_REJECT_UNAUTHORIZED", true),
};

export { getRequiredEnv };
