import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { registerService, loginService } from "../services/services.js";
import { validatePassword, validateUsername, validateEmail } from "../utils/passwordValidator.js";
import { verifyToken } from "../utils/jwt.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.json({ 
    status: "working",
    message: "API is running"
  });
});

app.get("/api", (req, res) => {
  res.json({ 
    status: "working",
    message: "API routes ready"
  });
});

// Register endpoint with full logic
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: usernameValidation.errors[0] 
      });
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: emailValidation.errors[0] 
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: passwordValidation.errors[0] 
      });
    }

    // Register user
    const user = await registerService(username, email, password);

    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error("Registration error:", err);
    
    // Handle duplicate key errors
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
});

// Login endpoint with full logic
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required"
      });
    }
    
    const result = await loginService(username, password);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Login error:", err);
    res.status(400).json({ 
      success: false, 
      error: err.message || "Login failed" 
    });
  }
});

// Profile endpoint (protected)
app.get("/api/auth/profile", (req, res) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ 
        success: false,
        error: "Missing token" 
      });
    }

    const token = header.split(" ")[1];
    const decoded = verifyToken(token);
    
    res.json({ 
      success: true,
      message: "You are authenticated", 
      user: decoded 
    });
  } catch (err) {
    res.status(401).json({ 
      success: false,
      error: "Invalid token" 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not found",
    path: req.path,
    availableRoutes: [
      "GET /",
      "GET /api",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/auth/profile"
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error"
  });
});

export default app;