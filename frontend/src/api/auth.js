const API_URL = import.meta.env.VITE_API_URL;

export async function registerUser(username, email, password) {
  try {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: data.error || `HTTP error! status: ${res.status}` };
    }

    return {
      success: true,
      requiresEmailVerification: Boolean(data.requiresEmailVerification),
      email: data.email,
      message: data.message,
      token: data.token,
      username: data.user?.username,
    };
  } catch (error) {
    return { success: false, error: error.message || "Network error" };
  }
}

export async function resendSignupVerification(email) {
  try {
    const res = await fetch(`${API_URL}/api/auth/register/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP error! status: ${res.status}` };
    }

    return { success: true, message: data.message || "Verification email resent." };
  } catch (error) {
    return { success: false, error: error.message || "Network error" };
  }
}

export async function verifyEmailToken(token) {
  try {
    const res = await fetch(`${API_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: data.error || `HTTP error! status: ${res.status}` };
    }

    return { success: true, message: data.message || "Email verified." };
  } catch (error) {
    return { success: false, error: error.message || "Network error" };
  }
}

export async function confirmPasswordChange(token) {
  try {
    const res = await fetch(`${API_URL}/api/auth/password/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: data.error || `HTTP error! status: ${res.status}` };
    }

    return { success: true, message: data.message || "Password changed." };
  } catch (error) {
    return { success: false, error: error.message || "Network error" };
  }
}

export async function confirmAccountDeletion(token) {
  try {
    const res = await fetch(`${API_URL}/api/auth/account/confirm-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: data.error || `HTTP error! status: ${res.status}` };
    }

    return { success: true, message: data.message || "Account deleted." };
  } catch (error) {
    return { success: false, error: error.message || "Network error" };
  }
}


export async function startDemoSession() {
  try {
    const res = await fetch(`${API_URL}/api/auth/demo-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: data.error || `HTTP error! status: ${res.status}` };
    }

    return {
      success: true,
      username: data.user?.username || "Demo User",
      demo: true,
    };
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
      credentials: "include",
    });

    if (!res.ok) {
      const errorData = await res.json();
      return { success: false, error: errorData.error || `HTTP error! status: ${res.status}` };
    }

    const data = await res.json();

    return { success: true, username: data.user.username, demo: data.user.demo === true };
  } catch (error) {
    return { success: false, error: error.message || "Network error" };
  }
}
