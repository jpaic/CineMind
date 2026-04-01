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
} from "../controllers/authController.js";
import { authRequired, blockDemoWrites } from "../middleware/authMiddleware.js";
import { authLimiter, registerLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register", registerLimiter, register);
router.post("/register/resend-verification", authLimiter, resendSignupVerification);
router.get("/verify-email", verifyEmail);
router.post("/login", authLimiter, login);
router.post("/demo-session", authLimiter, createDemoSession);

router.get("/verify", authRequired, verify);
router.get("/export", authRequired, blockDemoWrites, exportData);
router.delete("/library", authRequired, blockDemoWrites, resetLibrary);
router.put("/password", authRequired, blockDemoWrites, requestPasswordChange);
router.post("/password/confirm", confirmPasswordChange);
router.delete("/account", authRequired, blockDemoWrites, requestAccountDeletion);
router.post("/account/confirm-delete", confirmAccountDeletion);

router.get("/profile", authRequired, (req, res) => {
  res.json({ message: "You are authenticated", user: req.user });
});

export default router;
