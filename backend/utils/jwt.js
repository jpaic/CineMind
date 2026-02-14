import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

export function generateToken(payload) {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRY,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, ENV.JWT_SECRET);
}
