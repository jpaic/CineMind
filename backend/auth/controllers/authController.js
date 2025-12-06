import { registerService, loginService } from "../services/services.js";

export async function register(req, res) {
  try {
    const { username, email, password } = req.body;
    const user = await registerService(username, email, password);

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