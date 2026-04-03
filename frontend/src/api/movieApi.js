import { authUtils } from '../utils/authUtils.js';
import { bumpCollectionMutationVersion } from '../utils/pageCache';

// frontend/src/api/movieApi.js
const API_BASE_URL = import.meta.env.VITE_API_URL;
const PROFILE_BOOTSTRAP_TTL_MS = 2 * 60 * 1000;

let profileBootstrapCache = {
  data: null,
  timestamp: 0,
  token: null,
};

let profileBootstrapInFlight = null;

const getAuthToken = () => {
  const token = authUtils.getToken();
  return token;
};

// Helper to make authenticated requests
const ensureWritable = () => {
  if (authUtils.isDemoMode()) {
    throw new Error('Demo mode is read-only. Sign in to save changes.');
  }
};

const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (response.status === 401) {
    const error = new Error('Session expired. Please log in again.');
    error.status = 401;
    throw error;
  }
  
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Request failed' }));
    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    const rateLimitResetSeconds = Number(response.headers.get('ratelimit-reset'));
    const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : Number.isFinite(rateLimitResetSeconds) && rateLimitResetSeconds > 0
        ? rateLimitResetSeconds * 1000
        : null;

    const error = new Error(
      response.status === 429
        ? 'Rate limit exceeded. Please wait a moment and try again.'
        : (payload.error || `HTTP error! status: ${response.status}`)
    );
    error.status = response.status;
    error.retryAfterMs = retryAfterMs;

    // Handle different error types
    throw error;
  }
  
  return response.json();
};

// Helper for public requests (no auth)
const fetchPublic = async (url, options = {}) => {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

const isProfileBootstrapFresh = () => {
  const token = getAuthToken();
  if (!token) return false;
  if (profileBootstrapCache.token !== token) return false;

  return Boolean(profileBootstrapCache.data)
    && Date.now() - profileBootstrapCache.timestamp < PROFILE_BOOTSTRAP_TTL_MS;
};

const setProfileBootstrapCache = (data) => {
  profileBootstrapCache = {
    data,
    timestamp: Date.now(),
    token: getAuthToken(),
  };
};

export const movieApi = {
  // ===== LIBRARY ENDPOINTS =====
  
  // Add movie to user's library (with caching)
  addMovie: async (movieId, rating, watchedDate = new Date(), movieDetails = null) => {
    ensureWritable();
    // Cache movie details first if provided
    if (movieDetails) {
      await movieApi.cacheMovie(movieDetails);
    }
    
    const response = await fetchWithAuth(`${API_BASE_URL}/api/movies/add`, {
      method: 'POST',
      body: JSON.stringify({
        movie_id: movieId,
        rating: rating,
        watched_date: watchedDate
      }),
    });

    bumpCollectionMutationVersion();
    movieApi.invalidateProfileBootstrap();
    return response;
  },

  // Get user's movie library
  getLibrary: async (limit = 50, offset = 0) => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });

    return fetchWithAuth(`${API_BASE_URL}/api/movies/library?${params.toString()}`);
  },

  // Update movie rating
  updateRating: async (movieId, rating) => {
    ensureWritable();
    const response = await fetchWithAuth(`${API_BASE_URL}/api/movies/${movieId}/rating`, {
      method: 'PUT',
      body: JSON.stringify({ rating }),
    });

    bumpCollectionMutationVersion();
    movieApi.invalidateProfileBootstrap();
    return response;
  },

  // Delete movie from library
  deleteMovie: async (movieId) => {
    ensureWritable();
    const response = await fetchWithAuth(`${API_BASE_URL}/api/movies/${movieId}`, {
      method: 'DELETE',
    });

    bumpCollectionMutationVersion();
    movieApi.invalidateProfileBootstrap();
    return response;
  },

  // ===== SHOWCASE ENDPOINTS =====
  
  // Get user's showcase
  getShowcase: async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/movies/showcase`);
    
    // Convert backend positions (1-4) to frontend positions (0-3)
    if (response.success && response.showcase) {
      response.showcase = response.showcase.map(item => ({
        ...item,
        position: item.position - 1
      }));
    }
    
    return response;
  },

  // Set movie at specific position (0-3)
  setShowcasePosition: async (position, movieId) => {
    ensureWritable();
    // Convert frontend position (0-3) to backend position (1-4)
    const backendPosition = position + 1;
    
    const response = await fetchWithAuth(`${API_BASE_URL}/api/movies/showcase/${backendPosition}`, {
      method: 'PUT',
      body: JSON.stringify({ movie_id: movieId }),
    });

    movieApi.invalidateProfileBootstrap();
    return response;
  },

  // Remove movie from showcase position
  removeShowcasePosition: async (position) => {
    ensureWritable();
    // Convert frontend position (0-3) to backend position (1-4)
    const backendPosition = position + 1;
    
    const response = await fetchWithAuth(`${API_BASE_URL}/api/movies/showcase/${backendPosition}`, {
      method: 'DELETE',
    });

    movieApi.invalidateProfileBootstrap();
    return response;
  },

  getProfileBootstrap: async ({ forceRefresh = false, limit = 50, offset = 0 } = {}) => {
    const useDefaultWindow = limit === 50 && offset === 0;

    if (useDefaultWindow && !forceRefresh && isProfileBootstrapFresh()) {
      return profileBootstrapCache.data;
    }

    if (useDefaultWindow && profileBootstrapInFlight) {
      return profileBootstrapInFlight;
    }

    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });

    const request = fetchWithAuth(`${API_BASE_URL}/api/movies/profile/bootstrap?${params.toString()}`)
      .then((data) => {
        if (useDefaultWindow && data?.success) {
          setProfileBootstrapCache(data);
        }

        return data;
      });

    if (!useDefaultWindow) {
      return request;
    }

    profileBootstrapInFlight = request.finally(() => {
      profileBootstrapInFlight = null;
    });

    return profileBootstrapInFlight;
  },

  getCachedProfileBootstrapSnapshot: () => (
    isProfileBootstrapFresh() ? profileBootstrapCache.data : null
  ),

  prefetchProfileBootstrap: () => {
    if (isProfileBootstrapFresh() || profileBootstrapInFlight || !getAuthToken()) {
      return;
    }

    movieApi.getProfileBootstrap().catch(() => {});
  },

  invalidateProfileBootstrap: () => {
    profileBootstrapCache = {
      data: null,
      timestamp: 0,
      token: null,
    };
  },

  // ===== WATCHLIST ENDPOINTS =====
  
  // Get user's watchlist
  getWatchlist: async () => {
    return fetchWithAuth(`${API_BASE_URL}/api/movies/watchlist`);
  },

  // Add movie to watchlist (with caching)
  addToWatchlist: async (movieId, movieDetails = null) => {
    ensureWritable();
    // Cache movie details first if provided
    if (movieDetails) {
      await movieApi.cacheMovie(movieDetails);
    }
    
    const response = await fetchWithAuth(`${API_BASE_URL}/api/movies/watchlist/add`, {
      method: 'POST',
      body: JSON.stringify({ movie_id: movieId }),
    });

    bumpCollectionMutationVersion();
    return response;
  },

  // Remove movie from watchlist
  removeFromWatchlist: async (movieId) => {
    ensureWritable();
    const response = await fetchWithAuth(`${API_BASE_URL}/api/movies/watchlist/${movieId}`, {
      method: 'DELETE',
    });

    bumpCollectionMutationVersion();
    return response;
  },

  // Check if movie is in watchlist
  checkWatchlist: async (movieId) => {
    return fetchWithAuth(`${API_BASE_URL}/api/movies/watchlist/check/${movieId}`);
  },

  // ===== RECOMMENDATION ENDPOINTS =====
  getRecommendations: async (limit = 30, refresh = false) => {
    const params = new URLSearchParams({
      limit: String(limit),
      refresh: String(refresh),
    });

    return fetchWithAuth(`${API_BASE_URL}/api/movies/recommendations?${params.toString()}`);
  },

  // ===== CACHE ENDPOINTS (PUBLIC) =====
  
  // Get cached movie
  getCachedMovie: async (movieId) => {
    return fetchPublic(`${API_BASE_URL}/api/movies/cache/${movieId}`);
  },

  // Cache movie data
  cacheMovie: async (movieDetails) => {
    return fetchPublic(`${API_BASE_URL}/api/movies/cache`, {
      method: 'POST',
      body: JSON.stringify({
        movie_id: movieDetails.id,
        title: movieDetails.title,
        year: movieDetails.year,
        director: movieDetails.director,
        director_id: movieDetails.directorId,
        genres: movieDetails.genres || [],
        poster_path: movieDetails.poster,
      }),
    });
  },

  // Get multiple cached movies in bulk
  getCachedMoviesBulk: async (movieIds) => {
    return fetchPublic(`${API_BASE_URL}/api/movies/cache/bulk`, {
      method: 'POST',
      body: JSON.stringify({ movie_ids: movieIds }),
    });
  },

  // Clean old cache entries (admin/maintenance)
  cleanupCache: async () => {
    return fetchPublic(`${API_BASE_URL}/api/movies/cache/cleanup`, {
      method: 'DELETE',
    });
  },
};
