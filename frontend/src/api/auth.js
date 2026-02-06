import { authUtils } from "../utils/authUtils";

const API_URL = import.meta.env.VITE_API_URL;

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
    return { success: false, error: error.message || "Network error" };
  }
}

const getAuthHeaders = () => {
  const token = authUtils.getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
};

export async function getUserSettings() {
  const res = await fetch(`${API_URL}/api/auth/settings`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to load settings");
  }

  const data = await res.json();
  return data.settings;
}

export async function updateUserSettings(settings) {
  const res = await fetch(`${API_URL}/api/auth/settings`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(settings),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update settings");
  }

  const data = await res.json();
  return data.settings;
}
