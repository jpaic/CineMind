import { movieApi } from '../api/movieApi';
import { clearPageCache, readPageCache, writePageCache } from './pageCache';

const DISCOVER_CACHE_TTL_MS = 5 * 60 * 1000;

const listeners = new Set();
let activeLoadPromise = null;

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
      const movies = normalizeRecommendations(response?.recommendations || []);
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
