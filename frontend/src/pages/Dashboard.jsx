import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AddMovies from '../pages/AddMovies';
import MyMovies from '../pages/MyMovies';
import Discover from '../pages/Discover';
import Profile from '../pages/Profile';

export default function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const pathSegments = location.pathname.split('/');
  const currentTab = pathSegments[2] || 'dashboard';

  const handleTabClick = (tab) => {
    if (tab === 'dashboard') navigate(`/dashboard`);
    else navigate(`/dashboard/${tab}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Navbar
        loggedIn={true}
        onLogout={onLogout}
        activeTab={currentTab}
        setActiveTab={handleTabClick}
      />

      <div className="flex-1 flex flex-col items-center justify-start px-6 py-6 space-y-6">
        {currentTab === 'dashboard' && (
           <div className="flex-1 flex flex-col items-center justify-start px-6 py-6 space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-3xl font-bold">Welcome to Your Dashboard!</h2>
            <p className="text-gray-300 max-w-md sm:max-w-lg md:max-w-xl mx-auto">
              This is your personal movie hub. Track your rated movies, discover new films, and explore your stats.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 w-full">
              <div className="bg-gray-800 p-4 rounded-md shadow">Quick Stats / Box 1</div>
              <div className="bg-gray-800 p-4 rounded-md shadow">Quick Stats / Box 2</div>
              <div className="bg-gray-800 p-4 rounded-md shadow">Quick Stats / Box 3</div>
            </div>
          </div>
          
        )}

        {currentTab === 'discover' && <Discover />}
        {currentTab === 'rate' && <AddMovies />}
        {currentTab === 'library' && <MyMovies />}
        {currentTab === 'profile' && <Profile />}
      </div>

      <Footer />
    </div>
  );
}
