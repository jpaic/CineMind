import { Router } from "express";
import * as movieController from "../controllers/movieController.js";
import { authRequired, blockDemoWrites } from "../middleware/authMiddleware.js";
import { cacheLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// ===== USER MOVIES ROUTES (AUTH REQUIRED) =====
router.post("/add", authRequired, blockDemoWrites, movieController.addMovie);
router.get("/library", authRequired, movieController.getLibrary);
router.put("/:movieId/rating", authRequired, blockDemoWrites, movieController.updateRating);
router.delete("/:movieId", authRequired, blockDemoWrites, movieController.deleteMovie);

// ===== SHOWCASE ROUTES (AUTH REQUIRED) =====

// Get user's showcase
router.get("/showcase", authRequired, movieController.getShowcase);
router.get("/profile/bootstrap", authRequired, movieController.getProfileBootstrap);

// Set movie at specific position
router.put("/showcase/:position", authRequired, blockDemoWrites, movieController.setShowcasePosition);

// Remove movie from position
router.delete("/showcase/:position", authRequired, blockDemoWrites, movieController.deleteShowcasePosition);

// ===== WATCHLIST ROUTES (AUTH REQUIRED) =====

// Get user's watchlist
router.get("/watchlist", authRequired, movieController.getWatchlist);

// Add movie to watchlist
router.post("/watchlist/add", authRequired, blockDemoWrites, movieController.addToWatchlist);

// Remove movie from watchlist
router.delete("/watchlist/:movieId", authRequired, blockDemoWrites, movieController.removeFromWatchlist);

// Check if movie is in watchlist
router.get("/watchlist/check/:movieId", authRequired, movieController.checkWatchlist);

// ===== CACHE ROUTES (NO AUTH - PUBLIC) =====

// ===== RECOMMENDATION ROUTES (AUTH REQUIRED) =====
router.get("/recommendations", authRequired, movieController.getRecommendations);

// Get cached movie
router.get("/cache/:movieId", movieController.getCachedMovie);

// Cache movie data
router.post("/cache", cacheLimiter, movieController.cacheMovie);

// Get multiple cached movies
router.post("/cache/bulk", cacheLimiter, movieController.getCachedMovies);

// Clean old cache entries
router.delete("/cache/cleanup", cacheLimiter, movieController.cleanupCache);

export default router;
