import rateLimit from "express-rate-limit";

// General API rate limiter - 100 requests per 3 minutes
export const apiLimiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: "Too many requests, please try again later"
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Strict limiter for auth routes - 20 attempts per 3 minutes
export const authLimiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    success: false,
    error: "Too many login attempts, please try again after 15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Registration limiter - 10 accounts per hour per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: "Too many accounts created, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Cache write limiter - 60 requests per minute per IP
export const cacheLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: "Too many cache requests, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
});
