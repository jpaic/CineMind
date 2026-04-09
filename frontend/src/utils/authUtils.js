import { clearAllPageCaches } from "./pageCache";

const USERNAME_KEY = "username";
const DEMO_MODE_KEY = "demoMode";
const AUTH_STATE_KEY = "authActive";
const API_URL = import.meta.env.VITE_API_URL;

export const authUtils = {
  setAuth(username, demoMode = false) {
    if (username) {
      sessionStorage.setItem(USERNAME_KEY, username);
    }
    sessionStorage.setItem(AUTH_STATE_KEY, "true");

    if (demoMode) {
      sessionStorage.setItem(DEMO_MODE_KEY, "true");
    } else {
      sessionStorage.removeItem(DEMO_MODE_KEY);
    }
  },

  getUsername() {
    return sessionStorage.getItem(USERNAME_KEY) || "Guest";
  },

  isDemoMode() {
    return sessionStorage.getItem(DEMO_MODE_KEY) === "true";
  },

  isAuthenticated() {
    return sessionStorage.getItem(AUTH_STATE_KEY) === "true";
  },

  async verifyToken() {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        this.clearAuth();
        return false;
      }

      const data = await response.json();
      if (data.username) {
        sessionStorage.setItem(USERNAME_KEY, data.username);
      }
      if (data.demo === true) {
        sessionStorage.setItem(DEMO_MODE_KEY, "true");
      } else {
        sessionStorage.removeItem(DEMO_MODE_KEY);
      }
      sessionStorage.setItem(AUTH_STATE_KEY, "true");
      return data.valid === true;
    } catch {
      this.clearAuth();
      return false;
    }
  },

  async clearAuth({ clearAllCache = false } = {}) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // no-op
    }

    sessionStorage.removeItem(USERNAME_KEY);
    sessionStorage.removeItem(DEMO_MODE_KEY);
    sessionStorage.removeItem(AUTH_STATE_KEY);
    clearAllPageCaches();

    if (clearAllCache) {
      try {
        sessionStorage.clear();
        localStorage.clear();
      } catch {
        // no-op
      }
    }
  }
};
