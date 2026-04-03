import React, { useMemo, useState, useEffect } from 'react';
import { RefreshCw, SlidersHorizontal } from 'lucide-react';
import Card from '../components/Card';
import FilterBar from '../components/FilterBar';
import {
  getDiscoverRecommenderState,
  startDiscoverRecommenderLoad,
  subscribeToDiscoverRecommender,
} from '../utils/discoverRecommender';

export default function Discover() {
  const [discoverState, setDiscoverState] = useState(getDiscoverRecommenderState);
  const [activeFilters, setActiveFilters] = useState({});

  useEffect(() => {
    const unsubscribe = subscribeToDiscoverRecommender(setDiscoverState);
    return unsubscribe;
  }, []);

  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
  };

  const filteredMovies = useMemo(() => {
    let filtered = [...discoverState.movies];

    if (activeFilters.decade && activeFilters.decade !== 'all') {
      const decadeStart = parseInt(activeFilters.decade);
      const decadeEnd = decadeStart + 9;
      filtered = filtered.filter(m => m.year >= decadeStart && m.year <= decadeEnd);
    }

    if (activeFilters.genre && activeFilters.genre !== 'all') {
      filtered = filtered.filter(m =>
        m.genres && m.genres.some(g => g.toLowerCase() === activeFilters.genre.toLowerCase())
      );
    }

    if (activeFilters.ratingMin !== undefined) {
      filtered = filtered.filter(m => m.rating >= activeFilters.ratingMin);
    }
    if (activeFilters.ratingMax !== undefined) {
      filtered = filtered.filter(m => m.rating <= activeFilters.ratingMax);
    }

    if (activeFilters.sortBy === 'rating-desc') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (activeFilters.sortBy === 'rating-asc') {
      filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else if (activeFilters.sortBy === 'year-desc') {
      filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (activeFilters.sortBy === 'year-asc') {
      filtered.sort((a, b) => (a.year || 0) - (b.year || 0));
    } else if (activeFilters.sortBy === 'title-asc') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (activeFilters.sortBy === 'title-desc') {
      filtered.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    }

    return filtered;
  }, [activeFilters, discoverState.movies]);

  const isLoading = discoverState.status === 'loading';
  const hasError = discoverState.status === 'error';
  const hasMovies = discoverState.movies.length > 0;
  const buttonLabel = isLoading
    ? 'Loading...'
    : hasMovies
      ? 'Refresh'
      : hasError
        ? 'Retry'
        : 'Load';

  const handleLoad = () => {
    startDiscoverRecommenderLoad({ forceRefresh: hasMovies || hasError });
  };

  return (
    <div className="flex flex-col w-full bg-slate-950 text-slate-50 min-h-screen px-6 py-12">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl font-bold">Recommended For You</h2>
          <button
            onClick={handleLoad}
            disabled={isLoading}
            className="p-2 hover:bg-slate-800 rounded transition disabled:opacity-50 flex items-center gap-2"
            title={buttonLabel}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm">{buttonLabel}</span>
          </button>
        </div>

        <p className="text-slate-400 mb-6">
          {isLoading && 'We are building your recommendations now. You can leave and come back anytime.'}
          {discoverState.status === 'idle' && 'Tap Load to start recommendations. This page stays usable while it runs.'}
          {discoverState.status === 'ready' && 'Done. These picks are based on your taste and ratings.'}
          {hasError && `${discoverState.error}. Tap Retry to try again.`}
        </p>

        {hasMovies && (
          <FilterBar
            movies={discoverState.movies}
            onFilterChange={handleFilterChange}
            showRatingFilter={true}
          />
        )}

        {!hasMovies ? (
          <div className="text-center py-20">
            <SlidersHorizontal className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <p className="text-slate-400 text-lg">
              {isLoading ? 'Recommender is running...' : 'No recommendations loaded yet'}
            </p>
            <p className="text-slate-500 text-sm mt-2">
              {isLoading
                ? 'Feel free to browse other pages. Your results will appear when you return.'
                : 'Press Load to start. Once done, your recommendations will appear here.'}
            </p>
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
