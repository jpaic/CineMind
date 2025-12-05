import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Navbar({ loggedIn, onLogout, activeTab, setActiveTab }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/', { replace: true });
  };

  return (
    <nav className="w-full bg-gray-900 text-white shadow">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-4 sm:px-6 lg:px-8 py-4 space-y-2 md:space-y-0">
        
        <div
          className="flex items-center cursor-pointer"
          onClick={() => navigate(loggedIn ? '/dashboard' : '/')}
        >
          <img src={logo} alt="CineMind Logo" className="w-10 h-10 mr-3" />
          <span className="text-2xl font-bold">CineMind</span>
        </div>

        {loggedIn ? (
          <div className="flex flex-col md:flex-row items-center md:space-x-6 space-y-2 md:space-y-0 w-full md:w-auto">
            <div className="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0 items-center w-full md:w-auto">
              <button
                className={`py-2 px-3 font-semibold ${activeTab === 'discover' ? 'border-b-2 border-blue-500 text-blue-400' : ''}`}
                onClick={() => setActiveTab('discover')}
              >
                Discover
              </button>
              <button
                className={`py-2 px-3 font-semibold ${activeTab === 'rate' ? 'border-b-2 border-blue-500 text-blue-400' : ''}`}
                onClick={() => setActiveTab('rate')}
              >
                Add Movies
              </button>
              <button
                className={`py-2 px-3 font-semibold ${activeTab === 'library' ? 'border-b-2 border-blue-500 text-blue-400' : ''}`}
                onClick={() => setActiveTab('library')}
              >
                My Movies
              </button>
              <button
                className={`py-2 px-3 font-semibold ${activeTab === 'profile' ? 'border-b-2 border-blue-500 text-blue-400' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
            </div>

            <button
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md font-semibold transition w-full md:w-auto"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center md:space-x-4 space-y-2 md:space-y-0 w-full md:w-auto">
            <button
              className="hover:text-blue-400 transition w-full md:w-auto"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md font-semibold transition w-full md:w-auto"
              onClick={() => navigate('/login?signup=true')}
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
