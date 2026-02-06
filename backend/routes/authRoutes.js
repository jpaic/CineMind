import { Router } from "express";
import { register, login, verify, getSettings, updateSettings } from "../controllers/authController.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { authLimiter, registerLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register", registerLimiter, register);
router.post("/login", authLimiter, login);

router.get("/verify", authRequired, verify);

router.get("/settings", authRequired, getSettings);
router.put("/settings", authRequired, updateSettings);

router.get("/profile", authRequired, (req, res) => {
  res.json({ message: "You are authenticated", user: req.user });
});

export default router;
