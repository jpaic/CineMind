import React, { useState, useEffect } from 'react';
import { X, Search, Star, Loader } from 'lucide-react';
import { tmdbService } from '../api/tmdb';
import { movieApi } from '../api/movieApi';

export default function AddMovies({ onMovieAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await tmdbService.searchMovies(searchQuery);
        setSearchResults(results);
      } catch (err) {
        setError('Search failed. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleMovieSelect = async (movie) => {
    try {
      // Get full movie details including director
      const details = await tmdbService.getMovieDetails(movie.id);
      setSelectedMovie(details || movie);
    } catch (err) {
      setSelectedMovie(movie);
    }
  };

  const handleAddMovie = async () => {
    if (!selectedMovie || rating === 0) return;

    setIsAdding(true);
    setError(null);

    try {
      // Add movie with caching (movieApi will cache it automatically)
      await movieApi.addMovie(
        selectedMovie.id, 
        rating, 
        new Date(),
        selectedMovie // Pass movie details for caching
      );
      
      // Notify parent component to refresh data
      if (onMovieAdded) {
        onMovieAdded();
      }

      // Success feedback
      alert(`Added ${selectedMovie.title} with rating ${rating}/10`);
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to add movie. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setSelectedMovie(null);
      setRating(0);
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
    }, 200);
  };

  return (
    <div className="flex flex-col w-full items-center justify-start mt-70">
      {!isOpen ? (
          <div className="text-center flex flex-col items-center gap-2 w-full">
            <h2 className="text-3xl font-bold mb-3">Rate a Film</h2>
            <p className="text-slate-400 mb-8 max-w-md">
              Add your rating to get personalized recommendations
            </p>

            <button
              onClick={() => setIsOpen(true)}
              className="w-50 max-w-md px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 rounded font-medium text-sm transition-all duration-150 shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95"
            >
              + Add a Film
            </button>

            <label className="w-full max-w-md cursor-pointer center mt-4 flex items-center justify-center">
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  alert(`Selected file: ${file.name}`);
                  // TODO: Implement CSV import logic
                }
              }} 
            />
            <div className="w-50 px-6 py-2.5 bg-gradient-to-r from-green-500 to-lime-400 hover:from-green-400 hover:to-lime-300 rounded font-medium text-sm text-slate-50 transition-all duration-150 shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 text-center">
              Import from CSV
            </div>
          </label>
          </div>
      ) : (
        <div className={`fixed inset-0 flex items-start justify-center z-50 px-4 pt-16 modal-overlay ${isClosing ? 'modal-closing' : 'modal-opening'}`}>
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div className={`bg-slate-900 rounded-lg border border-slate-800 w-full max-w-2xl p-4 relative z-10 modal-content ${isClosing ? 'modal-content-closing' : 'modal-content-opening'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-50">Add a Film</h3>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-200 transition hover:scale-110 active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Content */}
            <div className="flex flex-col gap-4">
              {!selectedMovie ? (
                <>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search for a movie..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded bg-slate-800 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-slate-700 transition-all"
                      autoFocus
                    />
                    {isSearching && (
                      <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4 animate-spin" />
                    )}
                  </div>

                  {/* Search Results */}
                  <div className="space-y-1 max-h-72 overflow-y-auto overflow-x-hidden">
                    {searchResults.map((movie) => (
                      <div
                        key={movie.id}
                        onClick={() => handleMovieSelect(movie)}
                        className="flex items-center gap-3 p-2 rounded border border-slate-800 hover:border-purple-400/50 hover:bg-slate-800/50 cursor-pointer transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {movie.poster ? (
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-10 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-slate-700 rounded flex items-center justify-center text-slate-400 text-xs">
                            No Image
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium text-slate-50 text-sm">{movie.title}</h4>
                          <p className="text-xs text-slate-400">{movie.year || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                    {searchQuery && !isSearching && searchResults.length === 0 && (
                      <p className="text-slate-400 text-center py-4 text-sm">No results found</p>
                    )}
                    {!searchQuery && (
                      <p className="text-slate-400 text-center py-4 text-sm">Start typing to search for movies</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Selected Movie */}
                  <div className="flex gap-4">
                    {selectedMovie.poster ? (
                      <img
                        src={selectedMovie.poster}
                        alt={selectedMovie.title}
                        className="w-20 h-28 object-cover rounded ring-1 ring-slate-700"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-slate-700 rounded flex items-center justify-center text-slate-400 text-xs">
                        No Image
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-50 mb-1">{selectedMovie.title}</h4>
                      <p className="text-sm text-slate-400 mb-2">
                        {selectedMovie.year || 'N/A'}
                        {selectedMovie.director && ` · ${selectedMovie.director}`}
                      </p>
                      {selectedMovie.genres && selectedMovie.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {selectedMovie.genres.slice(0, 3).map((genre, idx) => (
                            <span key={idx} className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <button
                        onClick={() => {
                          setSelectedMovie(null);
                          setRating(0);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-200 transition hover:scale-105"
                      >
                        ← Choose a different film
                      </button>
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="block font-medium text-slate-50 mb-2 text-sm">Rate this film</label>
                    <div className="flex items-center gap-1.5">
                      {[1,2,3,4,5,6,7,8,9,10].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-125 active:scale-95"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= (hoverRating || rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        </button>
                      ))}
                      {rating > 0 && (
                        <span className="ml-2 text-slate-50 font-bold text-sm">{rating}/10</span>
                      )}
                    </div>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={handleAddMovie}
                    disabled={rating === 0 || isAdding}
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded font-medium text-sm transition-all duration-150 shadow-lg shadow-purple-500/20 mt-2 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isAdding ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add to My Films'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalOverlayOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes modalContentIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes modalContentOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
        }
        .modal-opening {
          animation: modalOverlayIn 0.25s ease-out forwards;
        }
        .modal-closing {
          animation: modalOverlayOut 0.2s ease-in forwards;
        }
        .modal-content-opening {
          animation: modalContentIn 0.25s ease-out forwards;
        }
        .modal-content-closing {
          animation: modalContentOut 0.2s ease-in forwards;
        }
      `}</style>
    </div>
  );
}
