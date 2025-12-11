import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function Discover() {
  const [hoveredMovie, setHoveredMovie] = useState(null);
  
  const recommendations = [
    { 
      id: 1,
      title: 'The Shawshank Redemption', 
      year: 1994,
      poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
      director: 'Frank Darabont',
      rating: 9.3,
      genres: ['Drama', 'Crime']
    },
    { 
      id: 2,
      title: 'The Dark Knight', 
      year: 2008,
      poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      director: 'Christopher Nolan',
      rating: 9.0,
      genres: ['Action', 'Crime', 'Drama']
    },
    { 
      id: 3,
      title: 'Pulp Fiction', 
      year: 1994,
      poster: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
      director: 'Quentin Tarantino',
      rating: 8.9,
      genres: ['Crime', 'Drama']
    },
    { 
      id: 4,
      title: 'Forrest Gump', 
      year: 1994,
      poster: 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
      director: 'Robert Zemeckis',
      rating: 8.8,
      genres: ['Drama', 'Romance']
    },
    { 
      id: 5,
      title: 'Fight Club', 
      year: 1999,
      poster: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      director: 'David Fincher',
      rating: 8.8,
      genres: ['Drama']
    },
    { 
      id: 6,
      title: 'The Godfather', 
      year: 1972,
      poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
      director: 'Francis Ford Coppola',
      rating: 9.2,
      genres: ['Crime', 'Drama']
    },
  ];

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = rating % 2 >= 0.5;
    
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
        <h2 className="text-3xl font-bold mb-2">Recommended For You</h2>
        <p className="text-slate-400 mb-8">
          Based on your taste and ratings
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {recommendations.map((movie) => (
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
                      <div className="flex items-center gap-1 mb-2">
                        {renderStars(movie.rating)}
                        <span className="text-xs text-slate-300">{movie.rating}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {movie.genres.slice(0, 2).map((genre, idx) => (
                          <span key={idx} className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}