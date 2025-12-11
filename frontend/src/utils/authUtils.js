import Cookies from "js-cookie";

const TOKEN_KEY = "authToken";
const USERNAME_KEY = "username";

export const authUtils = {
  setAuth(token, username, rememberMe = false) {
    if (rememberMe) {
      const options = { expires: 30, sameSite: "strict" };
      Cookies.set(TOKEN_KEY, token, options);
      if (username) Cookies.set(USERNAME_KEY, username, options);
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("username");
    } else {
      sessionStorage.setItem("token", token);
      if (username) sessionStorage.setItem("username", username);
      Cookies.remove(TOKEN_KEY);
      Cookies.remove(USERNAME_KEY);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("username");
  },

  getToken() {
    return Cookies.get(TOKEN_KEY) || sessionStorage.getItem("token");
  },

  getUsername() {
    return Cookies.get(USERNAME_KEY) || sessionStorage.getItem("username") || "Guest";
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  clearAuth() {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(USERNAME_KEY);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("username");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  },
};
