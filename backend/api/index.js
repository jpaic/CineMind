import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "../routes/authRoutes.js";
import movieRoutes from "../routes/movieRoutes.js";
import { apiLimiter } from "../middleware/rateLimiter.js";

dotenv.config();

const app = express();

// Render/hosting sits behind a reverse proxy; trust the first proxy hop for IP-based middleware.
app.set("trust proxy", 1);

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map(origin => origin.trim()).filter(Boolean)
  : ["http://localhost:5173"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health check routes ---
app.get("/", (req, res) => res.json({ status: "working", message: "API is running" }));
app.get("/api", (req, res) => res.json({ status: "working", message: "API routes ready" }));

// --- Rate limiting ---
app.use("/api/", apiLimiter);

// --- Mount routers ---
app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    availableRoutes: [
      "GET /",
      "GET /api",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/auth/profile",
      "POST /api/movies/add",
      "POST /api/movies/bulk-import",
      "GET /api/movies/library",
      "PUT /api/movies/:movieId/rating",
      "DELETE /api/movies/:movieId",
      "GET /api/movies/showcase",
      "PUT /api/movies/showcase/:position",
      "DELETE /api/movies/showcase/:position",
      "GET /api/movies/watchlist",
      "POST /api/movies/watchlist/add",
      "DELETE /api/movies/watchlist/:movieId",
      "GET /api/movies/watchlist/check/:movieId",
      "GET /api/movies/recommendations",
      "GET /api/movies/cache/:movieId",
      "POST /api/movies/cache",
      "POST /api/movies/cache/bulk-write",
      "POST /api/movies/cache/bulk"
    ]
  });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ success: false, error: err.message || "Internal server error" });
});

export default app;
