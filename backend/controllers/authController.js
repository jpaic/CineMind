import db from "../config/db.js";
import { registerService, loginService } from "../services/services.js";
import { getUserById, updateUserPassword } from "../models/user.js";
import { validatePassword, validateUsername, validateEmail } from "../utils/passwordValidator.js";
import { verifyPassword, hashPassword } from "../utils/hash.js";
import { sendWelcomeEmail } from "../services/emailService.js";

export async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: usernameValidation.errors[0]
      });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: emailValidation.errors[0]
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.errors[0]
      });
    }

    const user = await registerService(username, email, password);

    /*sendWelcomeEmail(email, username).catch(err =>
      console.error('Failed to send welcome email:', err)
    );*/

    res.status(201).json({ success: true, user });
  } catch (err) {
    if (err.code === '23505') {
      if (err.constraint === 'users_username_key') {
        return res.status(400).json({
          success: false,
          error: "Username already exists"
        });
      }
      if (err.constraint === 'users_email_key') {
        return res.status(400).json({
          success: false,
          error: "Email already exists"
        });
      }
    }

    res.status(400).json({
      success: false,
      error: err.message || "Registration failed"
    });
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
              mc.year
       FROM user_movies um
       LEFT JOIN movie_cache mc ON mc.movie_id = um.movie_id
       WHERE um.user_id = $1
       ORDER BY um.watched_date DESC, um.updated_at DESC`,
      [userId]
    );

    const csvHeader = [
      'Date',
      'Name',
      'Year',
      'Letterboxd URI',
      'Rating',
      'Review',
      'Tags',
      'Watched Date'
    ];

    const escapeCsv = (value) => {
      if (value === null || value === undefined) {
        return '';
      }

      const stringValue = String(value);
      if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const rows = result.rows.map((movie) => {
      const watchedDate = movie.watched_date ? new Date(movie.watched_date) : null;
      const isoDate = watchedDate ? watchedDate.toISOString().split('T')[0] : '';
      const title = movie.title || `TMDB ${movie.movie_id}`;
      const year = movie.year || '';
      const rating = Number.isFinite(Number(movie.rating)) ? Number(movie.rating).toFixed(1) : '';

      return [
        isoDate,
        title,
        year,
        '',
        rating,
        '',
        '',
        isoDate,
      ].map(escapeCsv).join(',');
    });

    const csv = [csvHeader.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="cinemind-letterboxd-export-${userId}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ success: false, error: 'Failed to export user data' });
  }
}

export async function resetLibrary(req, res) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM user_profile_showcase WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM user_watchlist WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM user_movies WHERE user_id = $1', [req.user.id]);

    await client.query('COMMIT');

    res.json({ success: true, message: 'Library reset successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reset library error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset library' });
  } finally {
    client.release();
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ success: false, error: passwordValidation.errors[0] });
    }

    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const newPasswordHash = await hashPassword(newPassword);
    await updateUserPassword(req.user.id, newPasswordHash);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
}

export async function deleteAccount(req, res) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM user_profile_showcase WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM user_watchlist WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM user_movies WHERE user_id = $1', [req.user.id]);
    const deleted = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.user.id]);

    if (deleted.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await client.query('COMMIT');

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  } finally {
    client.release();
  }
}
