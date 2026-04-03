import Cookies from "js-cookie";
import { clearAllPageCaches } from "./pageCache";

const TOKEN_KEY = "authToken";
const USERNAME_KEY = "username";
const DEMO_MODE_KEY = "demoMode";
const API_URL = import.meta.env.VITE_API_URL;
const isSecureContext = typeof window !== "undefined" && window.location.protocol === "https:";

export const authUtils = {
  /**
   * Store the token and username.
   * @param {string} token - JWT token
   * @param {string} username - Username
   * @param {boolean} rememberMe - Use cookie for persistent login
   * @param {boolean} demoMode - Session is demo/read-only
   */
  setAuth(token, username, rememberMe = false, demoMode = false) {
    if (rememberMe) {
      const options = {
        expires: 30,
        sameSite: "lax",
        secure: isSecureContext,
        path: "/"
      };
      Cookies.set(TOKEN_KEY, token, options);
      if (username) Cookies.set(USERNAME_KEY, username, options);

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("username");
    } else {
      // Only use sessionStorage
      sessionStorage.setItem("token", token);
      if (username) sessionStorage.setItem("username", username);

      // Remove cookies to avoid persistence
      Cookies.remove(TOKEN_KEY, { path: "/" });
      Cookies.remove(USERNAME_KEY, { path: "/" });
    }

    if (demoMode) {
      sessionStorage.setItem(DEMO_MODE_KEY, "true");
    } else {
      sessionStorage.removeItem(DEMO_MODE_KEY);
    }
  },

  /** Get the JWT token from storage */
  getToken() {
    return (
      Cookies.get(TOKEN_KEY) ||
      sessionStorage.getItem("token")
    );
  },

  /** Get the username from storage */
  getUsername() {
    return (
      Cookies.get(USERNAME_KEY) ||
      sessionStorage.getItem("username") ||
      "Guest"
    );
  },

  isDemoMode() {
    return sessionStorage.getItem(DEMO_MODE_KEY) === "true";
  },

  /** Check if user is authenticated (only checks if token exists) */
  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * Verify token with backend API
   * @returns {Promise<boolean>} True if token is valid
   */
  async verifyToken() {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/verify`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        // Token is invalid or expired, clear it
        this.clearAuth();
        return false;
      }

      const data = await response.json();
      if (data.demo === true) {
        sessionStorage.setItem(DEMO_MODE_KEY, "true");
      }
      return data.valid === true;
    } catch (error) {
      // On network error, be lenient and assume token might be valid
      // to avoid logging out users due to temporary network issues
      return this.isAuthenticated();
    }
  },

  clearAuth() {
    // Remove from all storage locations synchronously
    Cookies.remove(TOKEN_KEY, { path: "/" });
    Cookies.remove(USERNAME_KEY, { path: "/" });
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("username");
    sessionStorage.removeItem(DEMO_MODE_KEY);
    clearAllPageCaches();

    // Double-check: force removal with path variations (some cookies might have paths)
    Cookies.remove(TOKEN_KEY, { path: "/" });
    Cookies.remove(USERNAME_KEY, { path: "/" });

  },
};
