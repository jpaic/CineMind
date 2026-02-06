import { registerService, loginService } from "../services/services.js";
import { getUserSettings, updateAdultContentSetting } from "../models/user.js";
import { validatePassword, validateUsername, validateEmail } from "../utils/passwordValidator.js";
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

export async function getSettings(req, res) {
  try {
    const settings = await getUserSettings(req.user.id);
    res.json({
      success: true,
      settings: {
        adultContentEnabled: settings?.adult_content_enabled ?? false,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to load settings" });
  }
}

export async function updateSettings(req, res) {
  try {
    const { adultContentEnabled } = req.body;
    if (typeof adultContentEnabled !== "boolean") {
      return res.status(400).json({ success: false, error: "adultContentEnabled must be a boolean" });
    }

    const updated = await updateAdultContentSetting(req.user.id, adultContentEnabled);
    res.json({
      success: true,
      settings: {
        adultContentEnabled: updated?.adult_content_enabled ?? adultContentEnabled,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update settings" });
  }
}
