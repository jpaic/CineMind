import { authUtils } from "../utils/authUtils";

const API_URL = import.meta.env.VITE_API_URL;
console.log("API_URL:", API_URL);

export async function registerUser(username, email, password) {
  try {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return { success: false, error: errorData.error || `HTTP error! status: ${res.status}` };
    }

    const data = await res.json();
    
    return { success: true, token: data.token, username: data.user.username };
  } catch (error) {
    console.error("Register API call failed:", error);
    return { success: false, error: error.message || "Network error" };
  }
}

export async function loginUser(username, password) {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return { success: false, error: errorData.error || `HTTP error! status: ${res.status}` };
    }

    const data = await res.json();
    
    return { success: true, token: data.token, username: data.user.username };
  } catch (error) {
    console.error("Login API call failed:", error);
    return { success: false, error: error.message || "Network error" };
  }
}