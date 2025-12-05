import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Recommendations() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">

      <div className="flex-1 flex flex-col items-center justify-start px-6 py-6 space-y-6">
        <h2 className="text-3xl font-bold">Your Movie Recommendations</h2>
        <p className="text-gray-300 max-w-xl">
          Discover new movies tailored to your favorite genres, actors, and directors.
        </p>

        {/* Placeholder movie grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-4 shadow hover:shadow-lg transition">
              <div className="w-full h-48 bg-gray-700 rounded mb-4"></div>
              <h3 className="text-xl font-semibold">Movie Title {idx + 1}</h3>
              <p className="text-gray-400 text-sm mt-1">Some movie details or genres here</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
