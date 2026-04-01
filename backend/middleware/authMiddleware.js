import { verifyToken } from "../utils/jwt.js";

export function authRequired(req, res, next) {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ error: "Missing token" });

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Malformed authorization header" });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function blockDemoWrites(req, res, next) {
  if (req.user?.demo === true) {
    return res.status(403).json({
      success: false,
      error: "Demo mode is read-only. Sign in to save changes.",
      code: "DEMO_READ_ONLY",
    });
  }

  next();
}
