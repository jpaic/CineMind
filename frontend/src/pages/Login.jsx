import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Login({ onLogin }) {
  const location = useLocation();
  const [isSignup, setIsSignup] = useState(location.search.includes('signup'));
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
    navigate('/dashboard');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Navbar loggedIn={false} hideLinks={true} />

      <main className="flex flex-col items-center justify-center flex-1 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
            {isSignup ? 'Sign Up' : 'Login'}
          </h1>

          <form className="flex flex-col space-y-4" onSubmit={handleSubmit}>
            {isSignup && (
              <input
                type="text"
                placeholder="Username"
                className="px-4 py-2 rounded-md bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              className="px-4 py-2 rounded-md bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              className="px-4 py-2 rounded-md bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 py-2 rounded-md font-semibold transition"
            >
              {isSignup ? 'Sign Up' : 'Login'}
            </button>
          </form>

          <p className="text-sm text-gray-400 mt-4 text-center">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span
              className="text-blue-400 hover:underline cursor-pointer"
              onClick={() => setIsSignup(!isSignup)}
            >
              {isSignup ? 'Login' : 'Sign Up'}
            </span>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
