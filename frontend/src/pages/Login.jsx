import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authUtils } from "../utils/authUtils";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FilmReelLoading from "../components/FilmReelLoading";
import { loginUser, registerUser } from "../api/auth";

export default function Login({ onAuthComplete }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(location.search.includes("signup"));
  useEffect(() => {
    setIsSignup(location.search.includes("signup"));
  }, [location.search]);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const authInProgress = useRef(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (authInProgress.current) {
      return;
    }
    
    setError("");
    setLoading(true);
    setShowOverlay(true);
    authInProgress.current = true;

    try {
      let res;

      if (isSignup) {
        res = await registerUser(form.username, form.email, form.password);
      } else {
        res = await loginUser(form.username, form.password);
      }

      // Minimum 500ms loading time for UX
      await new Promise(resolve => setTimeout(resolve, 600));

      if (!res.success) {
        setError(res.error || "Something went wrong");
        setLoading(false);
        setShowOverlay(false);
        authInProgress.current = false;
        return;
      }

      authUtils.setAuth(res.token, res.username, isSignup ? true : rememberMe);

      // Call completion callback
      if (onAuthComplete) {
        onAuthComplete();
      }
      
    } catch (err) {
      setError("Server error. Try again.");
      setLoading(false);
      setShowOverlay(false);
      authInProgress.current = false;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50">
      <Navbar loggedIn={false} />

      {/* Loading Overlay */}
      <FilmReelLoading 
        isVisible={showOverlay} 
        message={isSignup ? "Creating account..." : "Logging in..."} 
      />

      <main className="flex flex-col items-center justify-center flex-1 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-slate-800 rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">
            {isSignup ? "Sign Up" : "Login"}
          </h1>

          {error && (
            <div className="bg-slate-900/60 border border-blue-500/40 text-slate-100 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form className="flex flex-col space-y-4" onSubmit={handleSubmit}>
            <div>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-slate-700 text-slate-50 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
                required
                disabled={loading}
              />
              {isSignup && (
                <p className="text-xs text-slate-400 mt-1">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              )}
            </div>

            {isSignup && (
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-slate-700 text-slate-50 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
                required
                disabled={loading}
              />
            )}

            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-slate-700 text-slate-50 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
                required
                disabled={loading}
              />
              {isSignup && (
                <div className="text-xs text-slate-400 mt-1 space-y-1">
                  <p>Password must contain:</p>
                  <ul className="list-disc list-inside pl-2">
                    <li>At least 8 characters</li>
                    <li>One uppercase letter</li>
                    <li>One lowercase letter</li>
                    <li>One number</li>
                  </ul>
                </div>
              )}
            </div>

            {!isSignup && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                  disabled={loading}
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2 text-sm text-slate-300 cursor-pointer select-none"
                >
                  Remember me
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 py-2 rounded-md font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : isSignup ? "Sign Up" : "Login"}
            </button>
          </form>

          <p className="text-sm text-slate-400 mt-4 text-center">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <span
              className="text-blue-400 hover:underline cursor-pointer"
              onClick={() =>
                navigate(isSignup ? "/login" : "/login?signup=true")
              }
            >
              {isSignup ? "Login" : "Sign Up"}
            </span>
          </p>

          {isSignup && (
            <p className="text-xs text-slate-500 mt-4 text-center">
              By signing up, you agree this is a demo project for portfolio purposes.
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
