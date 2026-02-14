import { verifyToken } from "../utils/jwt.js";
import { getUserById } from "../models/user.js";

export async function authRequired(req, res, next) {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ error: "Missing token" });

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Malformed authorization header" });
  }

  try {
    const decoded = verifyToken(token);

    if (!decoded?.id) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const user = await getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}
