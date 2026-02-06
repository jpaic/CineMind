import React, { useState, useEffect } from "react";
import { Plus, X, Search } from "lucide-react";
import { authUtils } from "../utils/authUtils";
import { movieApi } from "../api/movieApi";
import { tmdbService } from "../api/tmdb";
import Card from "../components/Card";
import FilmReelLoading from "../components/FilmReelLoading";

export default function Profile() {
  const [isPickingShowcase, setIsPickingShowcase] = useState(false);
  const [currentShowcaseIndex, setCurrentShowcaseIndex] = useState(null);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showcase, setShowcase] = useState([null, null, null, null]);
  const [userLibrary, setUserLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(authUtils.getUsername() || "Guest");

  // Load username on mount
  useEffect(() => {
    const storedUsername = authUtils.getUsername();
    if (storedUsername) setUsername(storedUsername);
  }, []);

  // Load showcase and library on mount
  useEffect(() => {
    loadShowcaseAndLibrary();
  }, []);

  const loadShowcaseAndLibrary = async () => {
    try {
      setLoading(true);

      // Load both library and showcase in parallel
      const [libraryData, showcaseData] = await Promise.all([
        movieApi.getLibrary(),
        movieApi.getShowcase()
      ]);

      const userMovies = libraryData.movies || [];
      const showcaseItems = showcaseData.showcase || [];

      if (userMovies.length === 0) {
        setUserLibrary([]);
        setShowcase([null, null, null, null]);
        return;
      }

      // Get movie IDs for bulk cache lookup
      const movieIds = userMovies.map(m => m.movie_id);

      // Try to get cached data first (single bulk request)
      const cacheResult = await movieApi.getCachedMoviesBulk(movieIds);
      const cachedMovies = cacheResult.movies || [];

      // For movies not in cache, fetch from TMDB
      const uncachedIds = movieIds.filter(
        id => !cachedMovies.find(cm => cm.movie_id === id)
      );

      let tmdbDetails = [];
      if (uncachedIds.length > 0) {
        // Fetch all uncached movies from TMDB
        tmdbDetails = await tmdbService.getMoviesDetails(uncachedIds);
        
        // Batch cache all newly fetched movies (don't await individual calls)
        const cachePromises = tmdbDetails.map(movie => 
          movieApi.cacheMovie(movie).catch(err => {
          })
        );
        
        // Fire and forget - don't block on caching
        Promise.all(cachePromises).catch(err => {
        });
      }

      // Combine cached and TMDB data
      const enrichedMovies = userMovies.map(userMovie => {
        const cached = cachedMovies.find(cm => cm.movie_id === userMovie.movie_id);
        const tmdb = tmdbDetails.find(m => m.id === userMovie.movie_id);
        
        return {
          id: userMovie.movie_id,
          title: cached ? cached.title : (tmdb?.title || 'Unknown'),
          rating: userMovie.rating,
          year: cached ? cached.year : tmdb?.year,
          poster: cached ? cached.poster_path : tmdb?.poster,
          director: cached ? cached.director : tmdb?.director,
          directorId: cached ? cached.director_id : tmdb?.directorId,
          genres: cached ? (typeof cached.genres === 'string' ? JSON.parse(cached.genres) : cached.genres) : (tmdb?.genres || []),
          watchedDate: userMovie.watched_date,
          updatedAt: userMovie.updated_at,
          adult: cached?.adult ?? tmdb?.adult ?? false,
        };
      });

      const adultEnabled = authUtils.getAdultContentEnabled();
      const filteredMovies = adultEnabled
        ? enrichedMovies
        : enrichedMovies.filter(movie => !movie.adult);

      setUserLibrary(filteredMovies);

      // Initialize showcase array
      const newShowcase = [null, null, null, null];
      
      // Fill showcase with movies from backend (positions already converted to 0-3 by API)
      for (const item of showcaseItems) {
        if (item.position >= 0 && item.position <= 3) {
          const movie = filteredMovies.find(m => m.id === item.movie_id);
          if (movie) {
            newShowcase[item.position] = movie;
          }
        }
      }

      setShowcase(newShowcase);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    filmsWatched: userLibrary.length,
    thisYear: userLibrary.filter(m => {
      const watchedYear = m.watchedDate ? new Date(m.watchedDate).getFullYear() : null;
      return watchedYear === new Date().getFullYear();
    }).length,
    avgRating: userLibrary.length > 0 
      ? (userLibrary.reduce((sum, m) => sum + m.rating, 0) / userLibrary.length).toFixed(1)
      : 0,
  };

  const directorCounts = userLibrary.reduce((acc, movie) => {
    if (movie.director) {
      acc[movie.director] = (acc[movie.director] || 0) + 1;
    }
    return acc;
  }, {});
  const favoriteDirector = Object.entries(directorCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const genreCounts = userLibrary.reduce((acc, movie) => {
    (movie.genres || []).forEach((genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
    });
    return acc;
  }, {});
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const ratingBuckets = userLibrary.reduce((acc, movie) => {
    const bucket = Math.floor(movie.rating || 0);
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});

  const user = {
    name: username,
    bio: "Film enthusiast and Christopher Nolan superfan. Love sci-fi, thrillers, and anything that makes me think.",
    favoriteGenres: topGenres.length > 0 ? topGenres.map(([genre]) => genre) : ["Sci-Fi", "Thriller", "Drama"],
    profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=1f2937&color=d4af37`,
    headerImage: "https://image.tmdb.org/t/p/original/jOzrELAzFxtMx2I4uDGHOotdfsS.jpg",
  };

  // Get movies already in showcase
  const showcaseMovieIds = showcase.filter(m => m !== null).map(m => m.id);

  // Filter out movies already in showcase
  const availableMovies = userLibrary.filter(movie => !showcaseMovieIds.includes(movie.id));

  const searchResults = searchQuery.length
    ? availableMovies.filter(movie => 
        movie.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleOpenModal = (index) => {
    setCurrentShowcaseIndex(index);
    setIsPickingShowcase(true);
    setSearchQuery("");
  };

  const handleCloseModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setIsPickingShowcase(false);
      setIsModalClosing(false);
      setCurrentShowcaseIndex(null);
      setSearchQuery("");
    }, 200);
  };

  const handleAddToShowcase = async (movie) => {
    try {
      // Verify movie is in user's library
      if (!userLibrary.find(m => m.id === movie.id)) {
        alert('This movie is not in your library. Please rate it first.');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      await movieApi.setShowcasePosition(currentShowcaseIndex, movie.id);
      
      // Update local state
      const newShowcase = [...showcase];
      newShowcase[currentShowcaseIndex] = movie;
      setShowcase(newShowcase);
      
      handleCloseModal();
    } catch (err) {
      const errorMsg = err.message || 'Failed to update showcase. Please try again.';
      alert(errorMsg);
    }
  };

  const handleRemoveFromShowcase = async (index) => {
    try {
      await movieApi.removeShowcasePosition(index);
      
      // Update local state
      const newShowcase = [...showcase];
      newShowcase[index] = null;
      setShowcase(newShowcase);
    } catch (err) {
      alert('Failed to update showcase. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full bg-slate-950 text-slate-50 min-h-screen relative">
        <FilmReelLoading isVisible={true} message="Loading your profile..." blocking={false} />
        
        {/* Skeleton content */}
        <div className="w-full h-32 sm:h-40 md:h-48 overflow-hidden relative bg-slate-900"></div>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0 w-full md:w-1/3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-slate-800 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-slate-950 text-slate-50 min-h-screen">
      {/* Header */}
      <div className="w-full h-32 sm:h-40 md:h-48 overflow-hidden relative">
        <img src={user.headerImage} alt="Header" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 to-slate-950"></div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row gap-6 items-start">
        {/* Left Column */}
        <div className="flex-shrink-0 w-full md:w-1/3 flex flex-col gap-4">
          {/* Profile Info */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <img src={user.profilePicture} alt={user.name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg ring-2 ring-purple-500/30" />
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent text-center md:text-left">{user.name}</h1>
            <p className="text-slate-300 text-sm sm:text-base line-clamp-4 text-center md:text-left">{user.bio}</p>
            <div className="flex flex-wrap gap-1 justify-center md:justify-start">
              {user.favoriteGenres.map((genre) => (
                <span key={genre} className="px-2 py-0.5 text-xs sm:text-sm border border-purple-500/30 rounded text-purple-300">
                  {genre}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2 mt-2">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="border border-slate-800 rounded p-3 hover:border-purple-500/30 transition">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{key.replace(/([A-Z])/g, " $1")}</p>
                <p className={`text-xl font-bold ${key === "thisYear" ? "text-purple-400" : "text-cyan-400"}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Taste Analytics */}
          <div className="border border-slate-800 rounded-lg p-4 hover:border-purple-500/30 transition">
            <h2 className="text-lg font-semibold text-slate-100 mb-3">Taste Analytics</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Favorite Director</p>
                <p className="text-sm text-slate-200">{favoriteDirector}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Top Genres</p>
                <div className="flex flex-wrap gap-1">
                  {topGenres.length > 0 ? (
                    topGenres.map(([genre, count]) => (
                      <span key={genre} className="px-2 py-0.5 text-xs border border-purple-500/30 rounded text-purple-300">
                        {genre} · {count}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No genre data yet</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Rating Spread</p>
                <div className="space-y-1">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const label = idx + 1;
                    const count = ratingBuckets[label] || 0;
                    const width = userLibrary.length ? Math.round((count / userLibrary.length) * 100) : 0;
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-4">{label}</span>
                        <div className="flex-1 h-2 bg-slate-800 rounded">
                          <div
                            className="h-2 rounded bg-gradient-to-r from-cyan-500 to-purple-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Showcase */}
        <div className="w-full flex justify-center mt-4 md:mt-0">
          {userLibrary.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg mb-2">No films rated yet</p>
              <p className="text-slate-500 text-sm">Rate some films to create your showcase</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:gap-6 md:gap-8 max-w-[500px] justify-items-center">
              {showcase.map((movie, idx) => (
                <div key={idx} className="relative group w-[160px] sm:w-[180px] md:w-[200px] aspect-[2/3] flex-shrink-0">
                  {movie ? (
                    <>
                      <Card movie={movie} showRating={true} index={idx} hideWatchlist={true} />
                      <button
                        onClick={() => handleRemoveFromShowcase(idx)}
                        className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition hover:scale-110 active:scale-90 z-10"
                      >
                        <X className="w-5 h-5 text-slate-300" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleOpenModal(idx)}
                      className="w-full h-full rounded border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-slate-900/30 hover:bg-slate-900/50 flex items-center justify-center text-purple-400/70 text-4xl sm:text-5xl transition-all hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-12 h-12 sm:w-16 sm:h-16" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Showcase Picker Modal */}
      {isPickingShowcase && (
        <div className={`fixed inset-0 flex items-start justify-center z-50 px-4 pt-16 modal-overlay ${isModalClosing ? 'modal-closing' : 'modal-opening'}`}>
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className={`bg-slate-900 rounded-lg border border-slate-800 w-full max-w-2xl p-4 relative z-10 modal-content ${isModalClosing ? 'modal-content-closing' : 'modal-content-opening'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-50">Choose a Film for Showcase</h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-200 transition hover:scale-110 active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search your rated films..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded bg-slate-800 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-slate-700 transition-all"
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="space-y-1 max-h-96 overflow-y-auto overflow-x-hidden">
              {searchResults.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => handleAddToShowcase(movie)}
                  className="flex items-center gap-3 p-2 rounded border border-slate-800 hover:border-purple-400/50 hover:bg-slate-800/50 cursor-pointer transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-10 h-14 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-slate-700 rounded flex items-center justify-center text-slate-400 text-xs flex-shrink-0">
                      No Image
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-50 text-sm truncate">{movie.title}</h4>
                    <p className="text-xs text-slate-400">{movie.year} · {movie.director}</p>
                    {movie.genres && movie.genres.length > 0 && (
                      <p className="text-xs text-slate-500">{movie.genres.slice(0, 2).join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <p className="text-slate-400 text-center py-4 text-sm">
                  {availableMovies.length === 0 ? "All your rated films are already in your showcase" : "No results found"}
                </p>
              )}
              {!searchQuery && (
                <p className="text-slate-400 text-center py-4 text-sm">Start typing to search your rated films</p>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalOverlayIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalOverlayOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
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
