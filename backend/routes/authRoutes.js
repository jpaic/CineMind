import { Router } from "express";
import {
  register,
  login,
  verify,
  exportData,
  resetLibrary,
  changePassword,
  deleteAccount,
} from "../controllers/authController.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { authLimiter, registerLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register", registerLimiter, register);
router.post("/login", authLimiter, login);

router.get("/verify", authRequired, verify);
router.get("/export", authRequired, exportData);
router.delete("/library", authRequired, resetLibrary);
router.put("/password", authRequired, changePassword);
router.delete("/account", authRequired, deleteAccount);

router.get("/profile", authRequired, (req, res) => {
  res.json({ message: "You are authenticated", user: req.user });
});

export default router;
