import React from 'react';

export default function MyMovies() {
  // Placeholder list
  const ratedMovies = [
    { title: 'Inception', rating: 9 },
    { title: 'The Matrix', rating: 10 },
    { title: 'Interstellar', rating: 8 },
    { title: 'Gladiator', rating: 9 },
  ];

  return (
    <div className="flex flex-col items-center justify-start px-6 py-6 space-y-6 w-full">
      <h2 className="text-3xl font-bold text-white">My Rated Movies</h2>
      <p className="text-gray-300 max-w-xl text-center">
        All the movies you’ve added or rated so far.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 w-full max-w-4xl">
        {ratedMovies.map((movie, idx) => (
          <div key={idx} className="bg-gray-800 rounded-lg p-4 shadow hover:shadow-lg transition">
            <div className="w-full h-48 bg-gray-700 rounded mb-4"></div>
            <h3 className="text-xl font-semibold text-white">{movie.title}</h3>
            <p className="text-gray-400 text-sm mt-1">Rating: {movie.rating}/10</p>
          </div>
        ))}
      </div>
    </div>
  );
}
