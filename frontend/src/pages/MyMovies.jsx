import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function MyMovies() {
  const [hoveredMovie, setHoveredMovie] = useState(null);
  
  const ratedMovies = [
    { 
      id: 1,
      title: 'Inception', 
      rating: 9, 
      year: 2010,
      poster: 'https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg',
      director: 'Christopher Nolan'
    },
    { 
      id: 2,
      title: 'The Matrix', 
      rating: 10, 
      year: 1999,
      poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
      director: 'Wachowski Sisters'
    },
    { 
      id: 3,
      title: 'Interstellar', 
      rating: 8, 
      year: 2014,
      poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      director: 'Christopher Nolan'
    },
    { 
      id: 4,
      title: 'Gladiator', 
      rating: 9, 
      year: 2000,
      poster: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
      director: 'Ridley Scott'
    },
  ];

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = (rating % 2) > 0;
    
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i}
            className={`w-3 h-3 ${
              i < fullStars 
                ? 'fill-amber-400 text-amber-400'
                : i === fullStars && hasHalfStar
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-700'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full bg-slate-950 text-slate-50 min-h-screen px-6 py-12">
      <div className="max-w-7xl mx-auto w-full">
        <h2 className="text-3xl font-bold mb-2">My Films</h2>
        <p className="text-slate-400 mb-8">
          {ratedMovies.length} films watched
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {ratedMovies.map((movie) => (
            <div 
              key={movie.id} 
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredMovie(movie.id)}
              onMouseLeave={() => setHoveredMovie(null)}
            >
              <div className="relative aspect-[2/3] rounded overflow-hidden bg-slate-900 ring-1 ring-slate-700 hover:ring-purple-400/50 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/20">
                <img 
                  src={movie.poster} 
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {hoveredMovie === movie.id && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent">
                    <div className="absolute inset-0 p-3 flex flex-col justify-end">
                      <h3 className="font-semibold text-sm text-slate-50 mb-1 line-clamp-2">{movie.title}</h3>
                      <p className="text-xs text-slate-300 mb-2">{movie.year} · {movie.director}</p>
                      <div className="flex items-center gap-1">
                        {renderStars(movie.rating)}
                        <span className="text-xs text-slate-300 ml-1">{movie.rating}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {ratedMovies.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No films rated yet</p>
            <p className="text-slate-500 text-sm mt-2">Start adding movies to see them here</p>
          </div>
        )}
      </div>
    </div>
  );
}