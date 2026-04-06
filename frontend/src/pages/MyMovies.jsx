import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import Card from '../components/Card';
import FilterBar from '../components/FilterBar';
import { movieApi } from '../api/movieApi';
import { tmdbService } from '../api/tmdb';
import FilmReelLoading from '../components/FilmReelLoading';
import { readPageCache, writePageCache } from '../utils/pageCache';

const LIBRARY_BATCH_SIZE = 50;

export default function MyMovies() {
  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLibrary = async ({ forceRefresh = false } = {}) => {
    try {
      setError(null);

      if (forceRefresh) {
        setMovies([]);
        setFilteredMovies([]);
      }

      if (!forceRefresh) {
        const cached = readPageCache({ key: 'library', mutationAware: true });
        if (cached) {
          setMovies(cached);
          setFilteredMovies(cached);
          setLoading(false);
          return;
        }
      }
      
      let offset = 0;
      let hasLoadedAnySegment = false;

      const appendSegment = (segmentMovies) => {
        setMovies((prev) => {
          const next = [...prev, ...segmentMovies];
          setFilteredMovies(next);
          writePageCache({ key: 'library', items: next, mutationAware: true });
          return next;
        });
      };

      while (true) {
        const libraryData = await movieApi.getLibrary(LIBRARY_BATCH_SIZE, offset);
        const libraryItems = libraryData.movies || [];

        if (libraryItems.length === 0) {
          break;
        }

        hasLoadedAnySegment = true;

        const movieIds = libraryItems.map(item => item.movie_id);

        const cacheResult = await movieApi.getCachedMoviesBulk(movieIds);
        const cachedMovies = cacheResult.movies || [];
        const cachedById = new Map(cachedMovies.map((movie) => [movie.movie_id, movie]));

        const uncachedIds = movieIds.filter((id) => !cachedById.has(id));

        const enrichedSegment = libraryItems.map(item => {
          const cached = cachedById.get(item.movie_id);

          return {
            id: item.movie_id,
            title: cached ? cached.title : 'Loading...',
            year: cached ? cached.year : null,
            poster: cached ? cached.poster_path : null,
            director: cached ? cached.director : null,
            directorId: cached ? cached.director_id : null,
            genres: cached ? (typeof cached.genres === 'string' ? JSON.parse(cached.genres) : cached.genres) : [],
            rating: item.rating,
            watchedAt: item.watched_at,
          };
        });

        appendSegment(enrichedSegment);

        if (loading) {
          setLoading(false);
        }

        if (uncachedIds.length > 0) {
          tmdbService.getMoviesDetails(uncachedIds).then((tmdbDetails) => {
            const tmdbById = new Map(tmdbDetails.map((movie) => [movie.id, movie]));
            const hydrateMovie = (movie) => {
              const tmdb = tmdbById.get(movie.id);
              if (!tmdb) return movie;
              return {
                ...movie,
                title: movie.title === 'Loading...' ? (tmdb.title || movie.title) : movie.title,
                year: movie.year || tmdb.year || null,
                poster: movie.poster || tmdb.poster || null,
                director: movie.director || tmdb.director || null,
                directorId: movie.directorId || tmdb.directorId || null,
                genres: movie.genres?.length ? movie.genres : (tmdb.genres || []),
              };
            };

            setMovies((prev) => {
              const next = prev.map(hydrateMovie);
              writePageCache({ key: 'library', items: next, mutationAware: true });
              return next;
            });
            setFilteredMovies((prev) => prev.map(hydrateMovie));

            movieApi.cacheMoviesBulk(tmdbDetails).catch(() => {});
          }).catch(() => {});
        }

        if (libraryItems.length < LIBRARY_BATCH_SIZE) {
          break;
        }

        offset += LIBRARY_BATCH_SIZE;
      }

      if (!hasLoadedAnySegment) {
        setMovies([]);
        setFilteredMovies([]);
        writePageCache({ key: 'library', items: [], mutationAware: true });
      }
    } catch (err) {
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
    fetchLibrary({ forceRefresh: true });
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
