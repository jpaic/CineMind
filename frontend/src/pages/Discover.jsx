import React, { useState, useEffect } from 'react';
import { RefreshCw, SlidersHorizontal } from 'lucide-react';
import Card from '../components/Card';
import FilterBar from '../components/FilterBar';
import { movieApi } from '../api/movieApi';
import FilmReelLoading from '../components/FilmReelLoading';
import { clearPageCache, readPageCache, writePageCache } from '../utils/pageCache';

const DISCOVER_CACHE_TTL_MS = 5 * 60 * 1000;

const normalizeRecommendations = (items) => {
  if (!Array.isArray(items)) return [];

  const seenIds = new Set();

  return items
    .map((item) => ({
      ...item,
      id: Number(item?.id),
      title: item?.title || 'Unknown',
      genres: Array.isArray(item?.genres) ? item.genres : [],
      rating: Number.isFinite(Number(item?.rating)) ? Number(item.rating) : null,
    }))
    .filter((item) => Number.isInteger(item.id) && item.id > 0)
    .filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });
};

export default function Discover() {
  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const applyMovies = (items) => {
    const normalized = normalizeRecommendations(items);
    setMovies(normalized);
    setFilteredMovies(normalized);
    return normalized;
  };

  const fetchRecommendations = async ({ forceRefresh = false } = {}) => {
    try {
      setError(null);

      if (!forceRefresh) {
        const cached = readPageCache({ key: 'discover', ttlMs: DISCOVER_CACHE_TTL_MS });
        if (cached) {
          applyMovies(cached);
          setLoading(false);
          return;
        }
      }

      const response = await movieApi.getRecommendations(30, forceRefresh);
      const items = applyMovies(response?.recommendations || []);
      writePageCache({ key: 'discover', items });
    } catch (err) {
      setError(err.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleRefresh = () => {
    clearPageCache('discover');
    setRefreshing(true);
    fetchRecommendations({ forceRefresh: true });
  };

  const handleFilterChange = (filters) => {
    let filtered = [...movies];

    if (filters.decade && filters.decade !== 'all') {
      const decadeStart = parseInt(filters.decade);
      const decadeEnd = decadeStart + 9;
      filtered = filtered.filter(m => m.year >= decadeStart && m.year <= decadeEnd);
    }

    if (filters.genre && filters.genre !== 'all') {
      filtered = filtered.filter(m =>
        m.genres && m.genres.some(g => g.toLowerCase() === filters.genre.toLowerCase())
      );
    }

    if (filters.ratingMin !== undefined) {
      filtered = filtered.filter(m => m.rating >= filters.ratingMin);
    }
    if (filters.ratingMax !== undefined) {
      filtered = filtered.filter(m => m.rating <= filters.ratingMax);
    }

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
        <FilmReelLoading isVisible={true} message="Loading recommendations..." blocking={false} />

        <div className="max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold">Recommended For You</h2>
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
          <p className="text-slate-100 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded text-sm transition"
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
          <h2 className="text-3xl font-bold">Recommended For You</h2>
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
          Based on your taste and ratings
        </p>

        {movies.length > 0 && (
          <FilterBar
            movies={movies}
            onFilterChange={handleFilterChange}
            showRatingFilter={true}
          />
        )}

        {movies.length === 0 ? (
          <div className="text-center py-20">
            <SlidersHorizontal className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <p className="text-slate-400 text-lg">No recommendations yet</p>
            <p className="text-slate-500 text-sm mt-2">Rate a few more movies to personalize your Discover feed</p>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No films match your filters</p>
            <p className="text-slate-500 text-sm mt-2">Try adjusting your filter criteria</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
