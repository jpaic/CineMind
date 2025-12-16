import { Router } from "express";
import { register, login } from "../controllers/authController.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { authLimiter, registerLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register", registerLimiter, register);
router.post("/login", authLimiter, login);

router.get("/profile", authRequired, (req, res) => {
  res.json({ message: "You are authenticated", user: req.user });
});

export default router;