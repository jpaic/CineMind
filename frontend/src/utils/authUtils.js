import Cookies from 'js-cookie';

const TOKEN_KEY = 'authToken';
const USERNAME_KEY = 'username';

export const authUtils = {
  setAuth(token, username, rememberMe = false) {
    if (rememberMe) {
      const options = { expires: 30, sameSite: 'strict' };
      Cookies.set(TOKEN_KEY, token, options);
      if (username) {
        Cookies.set(USERNAME_KEY, username, options);
      }
      sessionStorage.removeItem('token');
    } else {
      sessionStorage.setItem('token', token);
      Cookies.remove(TOKEN_KEY);
      Cookies.remove(USERNAME_KEY);
    }
    
    localStorage.removeItem('token');
  },

  getToken() {
    const cookieToken = Cookies.get(TOKEN_KEY);
    if (cookieToken) {
      return cookieToken;
    }
    return sessionStorage.getItem('token');
  },

  getUsername() {
    return Cookies.get(USERNAME_KEY);
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  clearAuth() {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(USERNAME_KEY);
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
  }
};