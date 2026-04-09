import { verifyToken } from "../utils/jwt.js";

function parseCookieToken(cookieHeader) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith("auth_token=")) {
      return decodeURIComponent(cookie.slice("auth_token=".length));
    }
  }
  return null;
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  const cookieToken = parseCookieToken(req.headers.cookie);

  if (!header && !cookieToken) return res.status(401).json({ error: "Missing token" });

  let token = cookieToken;
  if (header) {
    const [scheme, bearerToken] = header.split(" ");
    if (scheme !== "Bearer" || !bearerToken) {
      return res.status(401).json({ error: "Malformed authorization header" });
    }
    token = bearerToken;
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
