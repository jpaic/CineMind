import { Router } from "express";
import {
  register,
  login,
  createDemoSession,
  verify,
  exportData,
  resetLibrary,
  requestPasswordChange,
  confirmPasswordChange,
  requestAccountDeletion,
  confirmAccountDeletion,
  verifyEmail,
  resendSignupVerification,
  logout,
} from "../controllers/authController.js";
import { authRequired, blockDemoWrites } from "../middleware/authMiddleware.js";
import { authLimiter, registerLimiter, tokenConfirmLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register", registerLimiter, register);
router.post("/register/resend-verification", authLimiter, resendSignupVerification);
router.post("/verify-email", tokenConfirmLimiter, verifyEmail);
router.post("/login", authLimiter, login);
router.post("/demo-session", authLimiter, createDemoSession);
router.post("/logout", authRequired, logout);

router.get("/verify", authRequired, verify);
router.get("/export", authRequired, blockDemoWrites, exportData);
router.delete("/library", authRequired, blockDemoWrites, resetLibrary);
router.put("/password", authRequired, blockDemoWrites, requestPasswordChange);
router.post("/password/confirm", tokenConfirmLimiter, confirmPasswordChange);
router.delete("/account", authRequired, blockDemoWrites, requestAccountDeletion);
router.post("/account/confirm-delete", tokenConfirmLimiter, confirmAccountDeletion);

router.get("/profile", authRequired, (req, res) => {
  res.json({ message: "You are authenticated", user: req.user });
});

export default router;
