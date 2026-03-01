import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tmdbService } from '../api/tmdb';
import Card from '../components/Card';
import CardSkeleton from '../components/CardSkeleton';

export default function UpcomingMovies() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUpcomingMovies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch more movies for this dedicated page
        const upcomingData = await tmdbService.getUpcoming();
        setMovies(upcomingData);
      } catch (err) {
        setError('Failed to load upcoming movies. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingMovies();
  }, []);

  return (
    <div className="px-6 py-12 min-h-screen">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header with back button */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors mb-4 group"
          >
            <svg 
              className="w-5 h-5 group-hover:-translate-x-1 transition-transform" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>
          <h1 className="text-4xl font-bold mb-2 text-slate-50">
            Upcoming Releases
          </h1>
          <p className="text-slate-400">Movies coming to theaters soon</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-slate-900/60 border border-blue-500/40 rounded-lg p-4 mb-8">
            <p className="text-slate-100">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Movies Grid */}
        {!loading && movies.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {movies.map((movie, i) => (
              <div key={movie.id}>
                <Card movie={movie} showRating={false} index={i} />
                <div className="mt-3">
                  <h3 className="font-semibold text-slate-50 text-sm mb-1">{movie.title}</h3>
                  <p className="text-xs text-slate-400">{movie.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && movies.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No upcoming movies found</p>
          </div>
        )}
      </div>
    </div>
  );
}
