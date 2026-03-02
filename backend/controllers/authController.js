import crypto from "crypto";
import db from "../config/db.js";
import { loginService } from "../services/services.js";
import { getUserByEmail, getUserById, getUserByUsername, updateUserPassword } from "../models/user.js";
import { validatePassword, validateUsername, validateEmail } from "../utils/passwordValidator.js";
import { verifyPassword, hashPassword } from "../utils/hash.js";
import {
  sendSignupVerificationEmail,
  sendPasswordChangeConfirmationEmail,
  sendAccountDeletionConfirmationEmail,
} from "../services/emailService.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const SIGNUP_TOKEN_TTL_MINUTES = 15;
const ACTION_TOKEN_TTL_MINUTES = 15;
const SIGNUP_RESEND_LIMIT = 5;
const ACTION_RESEND_LIMIT = 3;
const SIGNUP_RESEND_COOLDOWN_SECONDS = 60;
const ACTION_RESEND_COOLDOWN_SECONDS = 60;

function generateRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

async function ensureAuthFlowTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS pending_registrations (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(20) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      resend_count INTEGER NOT NULL DEFAULT 0,
      last_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS account_action_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      action_type VARCHAR(32) NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      payload TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      resend_count INTEGER NOT NULL DEFAULT 0,
      last_sent_at TIMESTAMPTZ,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_account_action_tokens_lookup
      ON account_action_tokens(action_type, token_hash);
  `);
}

async function createSignupPendingRecord(username, email, password) {
  const passwordHash = await hashPassword(password);
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);

  await db.query(
    `INSERT INTO pending_registrations (username, email, password_hash, token_hash, expires_at, resend_count, last_sent_at)
     VALUES ($1, $2, $3, $4, NOW() + ($5 || ' minutes')::interval, 1, NOW())
     ON CONFLICT (email) DO UPDATE
     SET username = EXCLUDED.username,
         password_hash = EXCLUDED.password_hash,
         token_hash = EXCLUDED.token_hash,
         expires_at = EXCLUDED.expires_at,
         resend_count = 1,
         last_sent_at = NOW(),
         updated_at = NOW()`,
    [username, email, passwordHash, tokenHash, SIGNUP_TOKEN_TTL_MINUTES]
  );

  const verifyUrl = `${FRONTEND_URL}/login?verifyToken=${encodeURIComponent(rawToken)}`;
  await sendSignupVerificationEmail(email, username, verifyUrl, SIGNUP_TOKEN_TTL_MINUTES);
}

export async function register(req, res) {
  try {
    await ensureAuthFlowTables();

    const { username, email, password } = req.body;

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return res.status(400).json({ success: false, error: usernameValidation.errors[0] });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, error: emailValidation.errors[0] });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ success: false, error: passwordValidation.errors[0] });
    }

    const existingUserByEmail = await getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ success: false, error: "Email already exists" });
    }

    const existingUserByUsername = await getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ success: false, error: "Username already exists" });
    }

    await createSignupPendingRecord(username, email, password);

    return res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      email,
      message: "Check your email to confirm your account.",
    });
  } catch (err) {
    if (err.code === "23505") {
      if (err.constraint?.includes("username")) {
        return res.status(400).json({ success: false, error: "Username already exists" });
      }
      if (err.constraint?.includes("email")) {
        return res.status(400).json({ success: false, error: "Email already exists" });
      }
    }

    return res.status(400).json({ success: false, error: err.message || "Registration failed" });
  }
}

export async function resendSignupVerification(req, res) {
  try {
    await ensureAuthFlowTables();

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    const pendingResult = await db.query(
      `SELECT * FROM pending_registrations WHERE email = $1`,
      [email]
    );

    const pending = pendingResult.rows[0];
    if (!pending) {
      return res.status(200).json({ success: true, message: "If your email is pending verification, we sent a link." });
    }

    if (pending.resend_count >= SIGNUP_RESEND_LIMIT) {
      return res.status(429).json({ success: false, error: "Resend limit reached. Please sign up again." });
    }

    const cooldownUntil = pending.last_sent_at
      ? new Date(pending.last_sent_at).getTime() + SIGNUP_RESEND_COOLDOWN_SECONDS * 1000
      : 0;
    const now = Date.now();

    if (now < cooldownUntil) {
      const secondsLeft = Math.ceil((cooldownUntil - now) / 1000);
      return res.status(429).json({ success: false, error: `Please wait ${secondsLeft}s before resending.` });
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);

    await db.query(
      `UPDATE pending_registrations
       SET token_hash = $2,
           expires_at = NOW() + ($3 || ' minutes')::interval,
           resend_count = resend_count + 1,
           last_sent_at = NOW(),
           updated_at = NOW()
       WHERE email = $1`,
      [email, tokenHash, SIGNUP_TOKEN_TTL_MINUTES]
    );

    const verifyUrl = `${FRONTEND_URL}/login?verifyToken=${encodeURIComponent(rawToken)}`;
    await sendSignupVerificationEmail(email, pending.username, verifyUrl, SIGNUP_TOKEN_TTL_MINUTES);

    return res.json({ success: true, message: "Verification email resent." });
  } catch (error) {
    console.error("Resend signup verification error:", error);
    return res.status(500).json({ success: false, error: "Failed to resend verification email" });
  }
}

export async function verifyEmail(req, res) {
  const client = await db.connect();

  try {
    await ensureAuthFlowTables();
    const token = req.query.token || req.body?.token;

    if (!token) {
      return res.status(400).json({ success: false, error: "Verification token is required" });
    }

    const tokenHash = hashToken(String(token));

    await client.query("BEGIN");

    const pendingResult = await client.query(
      `SELECT * FROM pending_registrations WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash]
    );

    const pending = pendingResult.rows[0];
    if (!pending) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: "Verification link is invalid or expired" });
    }

    const existingEmail = await client.query("SELECT id FROM users WHERE email = $1", [pending.email]);
    const existingUsername = await client.query("SELECT id FROM users WHERE username = $1", [pending.username]);

    if (existingEmail.rows.length > 0 || existingUsername.rows.length > 0) {
      await client.query("DELETE FROM pending_registrations WHERE id = $1", [pending.id]);
      await client.query("COMMIT");
      return res.status(400).json({ success: false, error: "Account already exists. Please log in." });
    }

    const created = await client.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username`,
      [pending.email, pending.username, pending.password_hash]
    );

    await client.query("DELETE FROM pending_registrations WHERE id = $1", [pending.id]);
    await client.query("COMMIT");

    return res.json({ success: true, message: "Email confirmed. You can now log in.", user: created.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Verify email error:", error);
    return res.status(500).json({ success: false, error: "Failed to verify email" });
  } finally {
    client.release();
  }
}

export async function login(req, res) {
  try {
    const { username, password } = req.body;
    const result = await loginService(username, password);

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || "Login failed"
    });
  }
}

export async function verify(req, res) {
  res.json({
    valid: true,
    userId: req.user.id,
    username: req.user.username
  });
}

export async function exportData(req, res) {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT um.watched_date,
              um.rating,
              um.movie_id,
              mc.title,
              mc.year,
              um.created_at,
              um.updated_at
       FROM user_movies um
       LEFT JOIN movie_cache mc ON mc.movie_id = um.movie_id
       WHERE um.user_id = $1
       ORDER BY um.watched_date DESC, um.updated_at DESC`,
      [userId]
    );

    const csvHeader = [
      "Title",
      "Year",
      "TMDB ID",
      "Rating",
      "Watched Date",
      "Added At",
      "Updated At",
    ];

    const escapeCsv = (value) => {
      if (value === null || value === undefined) {
        return "";
      }

      const stringValue = String(value);
      if (stringValue.includes('"') || stringValue.includes(",") || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const rows = result.rows.map((movie) => {
      const watchedDate = movie.watched_date ? new Date(movie.watched_date).toISOString().split("T")[0] : "";
      const title = movie.title || `TMDB ${movie.movie_id}`;
      const year = movie.year || "";
      const rating = Number.isFinite(Number(movie.rating)) ? Number(movie.rating).toFixed(1) : "";
      const createdAt = movie.created_at ? new Date(movie.created_at).toISOString() : "";
      const updatedAt = movie.updated_at ? new Date(movie.updated_at).toISOString() : "";

      return [title, year, movie.movie_id, rating, watchedDate, createdAt, updatedAt]
        .map(escapeCsv)
        .join(",");
    });

    const csv = [csvHeader.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="cinemind-export-${userId}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error("Export data error:", error);
    res.status(500).json({ success: false, error: "Failed to export user data" });
  }
}

export async function resetLibrary(req, res) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM user_profile_showcase WHERE user_id = $1", [req.user.id]);
    await client.query("DELETE FROM user_watchlist WHERE user_id = $1", [req.user.id]);
    await client.query("DELETE FROM user_movies WHERE user_id = $1", [req.user.id]);

    await client.query("COMMIT");

    res.json({ success: true, message: "Library reset successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Reset library error:", error);
    res.status(500).json({ success: false, error: "Failed to reset library" });
  } finally {
    client.release();
  }
}

async function issueActionTokenAndEmail(user, actionType, payload, resendLimit, cooldownSeconds) {
  await ensureAuthFlowTables();

  const existingResult = await db.query(
    `SELECT * FROM account_action_tokens
     WHERE user_id = $1 AND action_type = $2 AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id, actionType]
  );

  const existing = existingResult.rows[0];
  const now = Date.now();

  if (existing) {
    if (existing.resend_count >= resendLimit) {
      throw new Error("Email limit reached. Please try again later.");
    }

    const cooldownUntil = existing.last_sent_at
      ? new Date(existing.last_sent_at).getTime() + cooldownSeconds * 1000
      : 0;

    if (now < cooldownUntil) {
      const secondsLeft = Math.ceil((cooldownUntil - now) / 1000);
      throw new Error(`Please wait ${secondsLeft}s before requesting another email.`);
    }
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);

  if (existing) {
    await db.query(
      `UPDATE account_action_tokens
       SET token_hash = $3,
           payload = $4,
           expires_at = NOW() + ($5 || ' minutes')::interval,
           resend_count = resend_count + 1,
           last_sent_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [existing.id, user.id, tokenHash, payload || null, ACTION_TOKEN_TTL_MINUTES]
    );
  } else {
    await db.query(
      `INSERT INTO account_action_tokens (user_id, action_type, token_hash, payload, expires_at, resend_count, last_sent_at)
       VALUES ($1, $2, $3, $4, NOW() + ($5 || ' minutes')::interval, 1, NOW())`,
      [user.id, actionType, tokenHash, payload || null, ACTION_TOKEN_TTL_MINUTES]
    );
  }

  return rawToken;
}

export async function requestPasswordChange(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "Current password and new password are required" });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ success: false, error: passwordValidation.errors[0] });
    }

    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({ success: false, error: "Current password is incorrect" });
    }

    const newPasswordHash = await hashPassword(newPassword);
    const rawToken = await issueActionTokenAndEmail(
      user,
      "password_change",
      newPasswordHash,
      ACTION_RESEND_LIMIT,
      ACTION_RESEND_COOLDOWN_SECONDS
    );

    const confirmUrl = `${FRONTEND_URL}/confirm/password-change?token=${encodeURIComponent(rawToken)}`;
    await sendPasswordChangeConfirmationEmail(user.email, user.username, confirmUrl, ACTION_TOKEN_TTL_MINUTES);

    return res.json({ success: true, message: "Check your email to confirm the password change." });
  } catch (error) {
    if (error.message?.includes("Please wait") || error.message?.includes("limit reached")) {
      return res.status(429).json({ success: false, error: error.message });
    }

    console.error("Request password change error:", error);
    return res.status(500).json({ success: false, error: "Failed to request password change" });
  }
}

export async function confirmPasswordChange(req, res) {
  try {
    await ensureAuthFlowTables();

    const token = req.query.token || req.body?.token;
    if (!token) {
      return res.status(400).json({ success: false, error: "Confirmation token is required" });
    }

    const tokenHash = hashToken(String(token));

    const tokenResult = await db.query(
      `SELECT * FROM account_action_tokens
       WHERE token_hash = $1
         AND action_type = 'password_change'
         AND consumed_at IS NULL
         AND expires_at > NOW()`,
      [tokenHash]
    );

    const tokenRow = tokenResult.rows[0];
    if (!tokenRow) {
      return res.status(400).json({ success: false, error: "Confirmation link is invalid or expired" });
    }

    await updateUserPassword(tokenRow.user_id, tokenRow.payload);

    await db.query(
      `UPDATE account_action_tokens
       SET consumed_at = NOW()
       WHERE id = $1`,
      [tokenRow.id]
    );

    return res.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    console.error("Confirm password change error:", error);
    return res.status(500).json({ success: false, error: "Failed to confirm password change" });
  }
}

export async function requestAccountDeletion(req, res) {
  try {
    const { currentPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ success: false, error: "Current password is required" });
    }

    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({ success: false, error: "Current password is incorrect" });
    }

    const rawToken = await issueActionTokenAndEmail(
      user,
      "account_delete",
      null,
      ACTION_RESEND_LIMIT,
      ACTION_RESEND_COOLDOWN_SECONDS
    );

    const confirmUrl = `${FRONTEND_URL}/confirm/account-deletion?token=${encodeURIComponent(rawToken)}`;
    await sendAccountDeletionConfirmationEmail(user.email, user.username, confirmUrl, ACTION_TOKEN_TTL_MINUTES);

    return res.json({ success: true, message: "Check your email to confirm account deletion." });
  } catch (error) {
    if (error.message?.includes("Please wait") || error.message?.includes("limit reached")) {
      return res.status(429).json({ success: false, error: error.message });
    }

    console.error("Request account deletion error:", error);
    return res.status(500).json({ success: false, error: "Failed to request account deletion" });
  }
}

export async function confirmAccountDeletion(req, res) {
  const client = await db.connect();

  try {
    await ensureAuthFlowTables();

    const token = req.query.token || req.body?.token;
    if (!token) {
      return res.status(400).json({ success: false, error: "Confirmation token is required" });
    }

    const tokenHash = hashToken(String(token));

    await client.query("BEGIN");

    const tokenResult = await client.query(
      `SELECT * FROM account_action_tokens
       WHERE token_hash = $1
         AND action_type = 'account_delete'
         AND consumed_at IS NULL
         AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    const tokenRow = tokenResult.rows[0];
    if (!tokenRow) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: "Confirmation link is invalid or expired" });
    }

    await client.query("UPDATE account_action_tokens SET consumed_at = NOW() WHERE id = $1", [tokenRow.id]);
    await client.query("DELETE FROM user_profile_showcase WHERE user_id = $1", [tokenRow.user_id]);
    await client.query("DELETE FROM user_watchlist WHERE user_id = $1", [tokenRow.user_id]);
    await client.query("DELETE FROM user_movies WHERE user_id = $1", [tokenRow.user_id]);
    await client.query("DELETE FROM users WHERE id = $1", [tokenRow.user_id]);

    await client.query("COMMIT");
    return res.json({ success: true, message: "Account deleted successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Confirm account deletion error:", error);
    return res.status(500).json({ success: false, error: "Failed to confirm account deletion" });
  } finally {
    client.release();
  }
}

// Backwards-compatible aliases for existing settings actions
export const changePassword = requestPasswordChange;
export const deleteAccount = requestAccountDeletion;
