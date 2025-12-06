import { getUserByEmail, getUserByUsername, createUser } from "../models/user.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";
import { generateToken } from "../utils/jwt.js";

export async function registerService(username, email, password) {
  const existing = await getUserByEmail(email);
  if (existing) throw new Error("Email already registered");

  const hashed = await hashPassword(password);
  return await createUser(email, username, hashed);
}

export async function loginService(username, password) {
  const user = await getUserByUsername(username);
  if (!user) throw new Error("User not found");

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) throw new Error("Invalid password");

  const token = generateToken({ id: user.id });

  return { token, user };
}
