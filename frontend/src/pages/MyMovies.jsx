import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import Card from '../components/Card';
import FilterBar from '../components/FilterBar';
import { movieApi } from '../api/movieApi';
import { tmdbService } from '../api/tmdb';
import FilmReelLoading from '../components/FilmReelLoading';

export default function MyMovies() {
  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLibrary = async () => {
    try {
      setError(null);
      
      const libraryData = await movieApi.getLibrary();
      const libraryItems = libraryData.movies || [];

      if (libraryItems.length === 0) {
        setMovies([]);
        setFilteredMovies([]);
        return;
      }

      const movieIds = libraryItems.map(item => item.movie_id);

      // Try to get cached data first (single bulk request)
      const cacheResult = await movieApi.getCachedMoviesBulk(movieIds);
      const cachedMovies = cacheResult.movies || [];

      // For movies not in cache, fetch from TMDB
      const uncachedIds = movieIds.filter(
        id => !cachedMovies.find(cm => cm.movie_id === id)
      );

      let tmdbDetails = [];
      if (uncachedIds.length > 0) {
        tmdbDetails = await tmdbService.getMoviesDetails(uncachedIds);
        
        // Batch cache all newly fetched movies (fire and forget)
        const cachePromises = tmdbDetails.map(movie => 
          movieApi.cacheMovie(movie).catch(err => {
            console.warn(`Failed to cache movie ${movie.id}:`, err);
          })
        );
        
        // Don't block on caching
        Promise.all(cachePromises).catch(err => {
          console.warn('Some movies failed to cache:', err);
        });
      }

      // Combine cached and TMDB data with user ratings
      const enrichedMovies = libraryItems.map(item => {
        const cached = cachedMovies.find(cm => cm.movie_id === item.movie_id);
        const tmdb = tmdbDetails.find(m => m.id === item.movie_id);
        
        return {
          id: item.movie_id,
          title: cached ? cached.title : (tmdb?.title || 'Unknown'),
          year: cached ? cached.year : tmdb?.year,
          poster: cached ? cached.poster_path : tmdb?.poster,
          director: cached ? cached.director : tmdb?.director,
          directorId: cached ? cached.director_id : tmdb?.directorId,
          genres: cached ? (typeof cached.genres === 'string' ? JSON.parse(cached.genres) : cached.genres) : (tmdb?.genres || []),
          rating: item.rating, // User's rating
          watchedAt: item.watched_at,
        };
      });

      setMovies(enrichedMovies);
      setFilteredMovies(enrichedMovies);
    } catch (err) {
      console.error('Failed to fetch library:', err);
      setError(err.message || 'Failed to load library');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLibrary();
  };

  const handleFilterChange = (filters) => {
    let filtered = [...movies];

    // Filter by decade
    if (filters.decade && filters.decade !== 'all') {
      const decadeStart = parseInt(filters.decade);
      const decadeEnd = decadeStart + 9;
      filtered = filtered.filter(m => m.year >= decadeStart && m.year <= decadeEnd);
    }

    // Filter by genre
    if (filters.genre && filters.genre !== 'all') {
      filtered = filtered.filter(m => 
        m.genres && m.genres.some(g => g.toLowerCase() === filters.genre.toLowerCase())
      );
    }

    // Filter by rating range
    if (filters.ratingMin !== undefined) {
      filtered = filtered.filter(m => m.rating >= filters.ratingMin);
    }
    if (filters.ratingMax !== undefined) {
      filtered = filtered.filter(m => m.rating <= filters.ratingMax);
    }

    // Sort
    if (filters.sortBy === 'rating-desc') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (filters.sortBy === 'rating-asc') {
      filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else if (filters.sortBy === 'year-desc') {
      filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (filters.sortBy === 'year-asc') {
      filtered.sort((a, b) => (a.year || 0) - (b.year || 0));
    } else if (filters.sortBy === 'title-asc') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (filters.sortBy === 'title-desc') {
      filtered.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    }

    setFilteredMovies(filtered);
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full bg-slate-950 text-slate-50 min-h-screen px-6 py-12 relative">
        <FilmReelLoading isVisible={true} message="Loading your films..." blocking={false} />
        
        {/* Skeleton content so the page structure is visible */}
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold">My Films</h2>
            <button disabled className="p-2 hover:bg-slate-800 rounded transition opacity-50">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <p className="text-slate-400 mb-8">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col w-full bg-slate-950 text-slate-50 min-h-screen items-center justify-center px-6">
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
    );
  }

  return (
    <div className="flex flex-col w-full bg-slate-950 text-slate-50 min-h-screen px-6 py-12">
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

        <p className="text-slate-400 mb-6">
          {movies.length} {movies.length === 1 ? 'film' : 'films'} watched
        </p>

        {movies.length > 0 && (
          <FilterBar 
            movies={movies} 
            onFilterChange={handleFilterChange}
            showRatingFilter={true}
          />
        )}

        {filteredMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredMovies.map((movie, index) => (
              <Card 
                key={movie.id} 
                movie={movie} 
                showRating={true}
                index={index}
              />
            ))}
          </div>
        ) : movies.length > 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No films match your filters</p>
            <p className="text-slate-500 text-sm mt-2">Try adjusting your filter criteria</p>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No films in your library</p>
            <p className="text-slate-500 text-sm mt-2">Start rating films to build your library</p>
          </div>
        )}
      </div>
    </div>
  );
}