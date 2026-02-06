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
