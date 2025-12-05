import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function AddMovies() {
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState('');

  const handleAdd = () => {
    if (!title || !rating) return;
    alert(`Added movie: ${title} with rating: ${rating}`);
    setTitle('');
    setRating('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">

      <div className="flex-1 flex flex-col items-center justify-start px-6 py-6 space-y-6">
        <h2 className="text-3xl font-bold">Add Movies</h2>
        <p className="text-gray-300 max-w-xl text-center">
          Add your favorite movies or rate movies you've already seen.
        </p>

        <div className="flex flex-col space-y-4 w-full max-w-md">
          <input
            type="text"
            placeholder="Movie Title"
            className="p-3 rounded-md bg-gray-800 text-white placeholder-gray-400"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="number"
            placeholder="Rating (0-10)"
            className="p-3 rounded-md bg-gray-800 text-white placeholder-gray-400"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            min="0"
            max="10"
          />
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-md font-semibold text-white transition"
          >
            Add Movie
          </button>
        </div>
      </div>

    </div>
  );
}
