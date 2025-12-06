import { Router } from "express";
import { register, login } from "../controllers/authController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// Example protected route
router.get("/profile", authRequired, (req, res) => {
  res.json({ message: "You are authenticated", user: req.user });
});

export default router;
