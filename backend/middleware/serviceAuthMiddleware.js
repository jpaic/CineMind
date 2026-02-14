import { ENV } from "../config/env.js";

export function serviceAuthRequired(req, res, next) {
  const serviceKey = req.headers["x-service-key"];

  if (!serviceKey || serviceKey !== ENV.CACHE_WRITE_SECRET) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  next();
}
