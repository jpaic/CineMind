import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Profile() {
  const user = {
    name: 'John Doe',
    favoriteGenre: 'Action',
    moviesRated: 12,
    recommendationsSeen: 24,
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">

      <div className="flex-1 flex flex-col items-center justify-start px-6 py-6 space-y-6">
        <h2 className="text-3xl font-bold">Your Profile</h2>
        <p className="text-gray-300 max-w-xl text-center">
          Overview of your activity and preferences.
        </p>

        <div className="bg-gray-800 rounded-lg p-6 shadow w-full max-w-md space-y-3">
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Favorite Genre:</strong> {user.favoriteGenre}</p>
          <p><strong>Movies Rated:</strong> {user.moviesRated}</p>
          <p><strong>Recommendations Seen:</strong> {user.recommendationsSeen}</p>
        </div>
      </div>

    </div>
  );
}
