// frontend/src/components/Card.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, Loader } from 'lucide-react';
import { getMovieUrl, getPersonUrl } from '../utils/urlUtils';
import { movieApi } from '../api/movieApi';
import { tmdbService } from '../api/tmdb';

export default function Card({ movie, onClick, showRating = false, index = 0, isPerson = false, onWatchlistChange, hideWatchlist = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(movie.inWatchlist || false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
  const navigate = useNavigate();

  // Check watchlist status on mount (for non-watchlist pages)
  useEffect(() => {
    if (!isPerson && !movie.inWatchlist) {
      checkWatchlistStatus();
    }
  }, [movie.id, isPerson]);

  const checkWatchlistStatus = async () => {
    try {
      const result = await movieApi.checkWatchlist(movie.id);
      setInWatchlist(result.inWatchlist);
    } catch (err) {
      setInWatchlist(false);
    }
  };

  // Handle both movie and person data structures
  const title = movie.title || movie.name;
  const poster = movie.poster || movie.image;
  const year = movie.year;
  const director = movie.director || movie.notableWork;
  const role = movie.role;

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

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (isPerson) {
      navigate(getPersonUrl(movie.id, title));
    } else {
      navigate(getMovieUrl(movie.id, title));
    }
  };

  const handleDirectorClick = (e) => {
    e.stopPropagation();
    // Navigate to director page if we have the director ID
    if (movie.directorId) {
      navigate(getPersonUrl(movie.directorId, director));
    }
  };

  const handleWatchlistToggle = async (e) => {
    e.stopPropagation();
    
    if (isTogglingWatchlist) return;

    setIsTogglingWatchlist(true);

    try {
      if (inWatchlist) {
        // Remove from watchlist
        await movieApi.removeFromWatchlist(movie.id);
        setInWatchlist(false);
        
        // Notify parent if callback provided (for watchlist page to refresh)
        if (onWatchlistChange) {
          onWatchlistChange(movie.id, false);
        }
      } else {
        // Add to watchlist - need to get full movie details first if not available
        let movieDetails = null;
        if (!movie.genres || !movie.director) {
          movieDetails = await tmdbService.getMovieDetails(movie.id);
        } else {
          movieDetails = {
            id: movie.id,
            title: movie.title,
            year: movie.year,
            poster: movie.poster,
            director: movie.director,
            directorId: movie.directorId,
            genres: movie.genres,
          };
        }

        await movieApi.addToWatchlist(movie.id, movieDetails);
        setInWatchlist(true);
        
        // Notify parent if callback provided
        if (onWatchlistChange) {
          onWatchlistChange(movie.id, true);
        }
      }
    } catch (err) {
      alert('Failed to update watchlist. Please try again.');
    } finally {
      setIsTogglingWatchlist(false);
    }
  };

  return (
    <div 
      className="group cursor-pointer movie-card"
      style={{
        animationDelay: `${index * 50}ms`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className={`relative ${isPerson ? 'aspect-[3/4]' : 'aspect-[2/3]'} rounded overflow-hidden bg-slate-900 ring-1 ring-slate-700 hover:ring-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 group-hover:scale-[1.03] group-active:scale-[0.98]`}>
        <img 
          src={poster} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Watchlist Toggle Button (only for movies, not people, and not hidden) */}
        {!isPerson && !hideWatchlist && isHovered && (
          <button
            onClick={handleWatchlistToggle}
            disabled={isTogglingWatchlist}
            className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-all duration-200 z-10 ${
              inWatchlist 
                ? 'bg-blue-500/90 text-slate-50 hover:bg-blue-600/90' 
                : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800/90'
            } ${isTogglingWatchlist ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
            title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            {isTogglingWatchlist ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
          </button>
        )}
        
        {isHovered && (
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent animate-fade-in">
            <div className="absolute inset-0 p-3 flex flex-col justify-end">
              {isPerson && role && (
                <span className="inline-block px-2 py-1 bg-blue-500/80 text-slate-50 text-xs rounded-full mb-2 w-fit">
                  {role}
                </span>
              )}
              <h3 className="font-semibold text-sm text-slate-50 mb-1 line-clamp-2">
                {title}
              </h3>
              <p className="text-xs text-slate-300 mb-2">
                {isPerson ? (
                  director
                ) : (
                  <>
                    {year} ·
                    {movie.directorId ? (
                      <button
                        onClick={handleDirectorClick}
                        className="hover:text-blue-500 transition hover:underline ml-1"
                      >
                        {director}
                      </button>
                    ) : (
                      <span className="ml-1">{director}</span>
                    )}
                  </>
                )}
              </p>
              {showRating && movie.rating && (
                <div className="flex items-center gap-1 mb-2">
                  {renderStars(movie.rating)}
                  <span className="text-xs text-slate-300 ml-1">{movie.rating}</span>
                </div>
              )}
              {movie.genres && (
                <div className="flex flex-wrap gap-1">
                  {movie.genres.slice(0, 2).map((genre, idx) => (
                    <span key={idx} className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .movie-card {
          animation: fadeInUp 0.4s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
