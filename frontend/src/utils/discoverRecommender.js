import { movieApi } from '../api/movieApi';
import { tmdbService } from '../api/tmdb';
import { clearPageCache, readPageCache, writePageCache } from './pageCache';

const DISCOVER_CACHE_TTL_MS = 5 * 60 * 1000;

const listeners = new Set();
let activeLoadPromise = null;

const clampFiveStarRating = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  // IMDb/TMDB ratings are often on a 10-point scale, while our UI is 5 stars.
  const normalized = parsed > 5 ? parsed / 2 : parsed;
  return Math.max(0.5, Math.min(5, Number(normalized.toFixed(1))));
};

const parseImdbRatingValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const matched = trimmed.match(/(\d+(\.\d+)?)/);
    if (!matched) return null;
    return Number(matched[1]);
  }
  return null;
};

const normalizeRecommendationRating = (item) => {
  const candidateValues = [
    item?.rating,
    item?.vote_average,
    item?.imdbRating,
    item?.imdb_rating,
    item?.rating_stats?.imdb,
    item?.rating_stats?.imdb_rating,
    item?.rating_stats?.average,
    item?.rating_stats?.avg,
  ];

  for (const rawValue of candidateValues) {
    const parsed = parseImdbRatingValue(rawValue);
    const normalized = clampFiveStarRating(parsed);
    if (normalized !== null) return normalized;
  }

  return null;
};

const normalizeRecommendations = (items) => {
  if (!Array.isArray(items)) return [];

  const seenIds = new Set();

  return items
    .map((item) => ({
      ...item,
      id: Number(item?.id),
      title: item?.title || 'Unknown',
      genres: Array.isArray(item?.genres) ? item.genres : [],
      rating: normalizeRecommendationRating(item),
    }))
    .filter((item) => Number.isInteger(item.id) && item.id > 0)
    .filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });
};

const hydrateMissingRecommendationMetadata = async (movies) => {
  const items = Array.isArray(movies) ? movies : [];
  if (items.length === 0) return items;

  const missingMetadataIds = items
    .filter((movie) => (
      !movie?.year
      || !movie?.director
      || !Array.isArray(movie?.genres)
      || movie.genres.length === 0
    ))
    .map((movie) => movie.id)
    .filter((id) => Number.isInteger(id) && id > 0);

  if (missingMetadataIds.length === 0) {
    return items;
  }

  const tmdbDetails = await tmdbService.getMoviesDetails(missingMetadataIds);
  if (!Array.isArray(tmdbDetails) || tmdbDetails.length === 0) {
    return items;
  }

  const detailsById = new Map(tmdbDetails.map((movie) => [movie.id, movie]));
  const hydrated = items.map((movie) => {
    const details = detailsById.get(movie.id);
    if (!details) return movie;

    return {
      ...movie,
      title: movie.title || details.title,
      year: movie.year || details.year || null,
      poster: movie.poster || details.poster || null,
      director: movie.director || details.director || null,
      directorId: movie.directorId || details.directorId || null,
      genres: movie.genres?.length ? movie.genres : (details.genres || []),
    };
  });

  await Promise.allSettled(
    tmdbDetails.map((movie) => movieApi.cacheMovie(movie))
  );

  return hydrated;
};

const cached = readPageCache({ key: 'discover', ttlMs: DISCOVER_CACHE_TTL_MS });
let state = {
  status: cached ? 'ready' : 'idle',
  movies: normalizeRecommendations(cached || []),
  error: null,
  lastUpdatedAt: cached ? Date.now() : null,
};

const notify = () => {
  listeners.forEach((listener) => listener(state));
};

const setState = (partialState) => {
  state = { ...state, ...partialState };
  notify();
};

export const getDiscoverRecommenderState = () => state;

export const subscribeToDiscoverRecommender = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const startDiscoverRecommenderLoad = async ({ forceRefresh = false } = {}) => {
  if (activeLoadPromise) return activeLoadPromise;

  setState({ status: 'loading', error: null });

  activeLoadPromise = (async () => {
    try {
      const response = await movieApi.getRecommendations(30, forceRefresh);
      const normalizedMovies = normalizeRecommendations(response?.recommendations || []);
      const movies = await hydrateMissingRecommendationMetadata(normalizedMovies);
      writePageCache({ key: 'discover', items: movies });
      setState({
        status: 'ready',
        movies,
        error: null,
        lastUpdatedAt: Date.now(),
      });
    } catch (error) {
      setState({
        status: 'error',
        error: error?.message || 'Failed to load recommendations',
      });
    } finally {
      activeLoadPromise = null;
    }
  })();

  return activeLoadPromise;
};

export const resetDiscoverRecommender = () => {
  clearPageCache('discover');
  setState({
    status: 'idle',
    movies: [],
    error: null,
    lastUpdatedAt: null,
  });
};
