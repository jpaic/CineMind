import Cookies from "js-cookie";

const TOKEN_KEY = "authToken";
const USERNAME_KEY = "username";
const API_URL = import.meta.env.VITE_API_URL;

export const authUtils = {
  /**
   * Store the token and username.
   * @param {string} token - JWT token
   * @param {string} username - Username
   * @param {boolean} rememberMe - Use cookie for persistent login
   */
  setAuth(token, username, rememberMe = false) {
    if (rememberMe) {
      const options = { expires: 30, sameSite: "strict" };
      Cookies.set(TOKEN_KEY, token, options);
      if (username) Cookies.set(USERNAME_KEY, username, options);

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("username");
    } else {
      // Only use sessionStorage
      sessionStorage.setItem("token", token);
      if (username) sessionStorage.setItem("username", username);

      // Remove cookies to avoid persistence
      Cookies.remove(TOKEN_KEY);
      Cookies.remove(USERNAME_KEY);
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
        console.log('[authUtils] Token verification failed:', response.status);
        // Token is invalid or expired, clear it
        this.clearAuth();
        return false;
      }

      const data = await response.json();
      console.log('[authUtils] Token verified successfully');
      return data.valid === true;
    } catch (error) {
      console.error('[authUtils] Token verification error:', error);
      // On network error, be lenient and assume token might be valid
      // to avoid logging out users due to temporary network issues
      return this.isAuthenticated();
    }
  },

  clearAuth() {
    // Remove from all storage locations synchronously
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(USERNAME_KEY);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("username");
    
    // Double-check: force removal with path variations (some cookies might have paths)
    Cookies.remove(TOKEN_KEY, { path: '/' });
    Cookies.remove(USERNAME_KEY, { path: '/' });
    
    console.log('[authUtils] Auth cleared. Token check:', this.getToken());
  },
};