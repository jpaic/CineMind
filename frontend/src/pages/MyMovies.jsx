import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import Card from '../components/Card';
import { movieApi } from '../api/movieApi';
import { tmdbService } from '../api/tmdb';
import FilmReelLoading from '../components/FilmReelLoading';

export default function MyMovies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMovies = async () => {
    try {
      setError(null);
      
      const libraryData = await movieApi.getLibrary();
      const userMovies = libraryData.movies || [];

      if (userMovies.length === 0) {
        setMovies([]);
        return;
      }

      const movieIds = userMovies.map(m => m.movie_id);
      const tmdbDetails = await tmdbService.getMoviesDetails(movieIds);

      const enrichedMovies = userMovies.map(userMovie => {
        const tmdbData = tmdbDetails.find(m => m.id === userMovie.movie_id);
        return {
          id: userMovie.movie_id,
          title: tmdbData?.title || 'Unknown',
          rating: userMovie.rating,
          year: tmdbData?.year,
          poster: tmdbData?.poster,
          director: tmdbData?.director,
          genres: tmdbData?.genres || [],
          watchedDate: userMovie.watched_date,
          updatedAt: userMovie.updated_at,
        };
      });

      setMovies(enrichedMovies);
    } catch (err) {
      console.error('Failed to fetch movies:', err);
      setError(err.message || 'Failed to load movies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMovies();
  };

  return (
    <div className="flex flex-col w-full bg-slate-950 text-slate-50 min-h-screen px-6 py-12 relative">
      {/* Loading overlay */}
      <FilmReelLoading isVisible={loading} message="Loading your library..." />

      {error && !loading && (
        <div className="flex flex-col w-full items-center justify-center px-6 absolute inset-0 bg-slate-950/95 z-50">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm transition"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold">My Films</h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-slate-800 rounded transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-slate-400 mb-8">
            {movies.length} {movies.length === 1 ? 'film' : 'films'} watched
          </p>

          {movies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {movies.map((movie, index) => (
                <Card key={movie.id} movie={movie} showRating={true} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-slate-400 text-lg">No films rated yet</p>
              <p className="text-slate-500 text-sm mt-2">Start adding movies to see them here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
