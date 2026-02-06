import { authUtils } from '../utils/authUtils.js';

// frontend/src/api/movieApi.js
const API_BASE_URL = import.meta.env.VITE_API_URL;

const getAuthToken = () => {
  const token = authUtils.getToken();
  return token;
};

// Helper to make authenticated requests
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
    throw new Error('Session expired. Please log in again.');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    // Handle different error types
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
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

export const movieApi = {
  // ===== LIBRARY ENDPOINTS =====
  
  // Add movie to user's library (with caching)
  addMovie: async (movieId, rating, watchedDate = new Date(), movieDetails = null) => {
    // Cache movie details first if provided
    if (movieDetails) {
      await movieApi.cacheMovie(movieDetails);
    }
    
    return fetchWithAuth(`${API_BASE_URL}/api/movies/add`, {
      method: 'POST',
      body: JSON.stringify({
        movie_id: movieId,
        rating: rating,
        watched_date: watchedDate
      }),
    });
  },

  // Get user's movie library
  getLibrary: async () => {
    return fetchWithAuth(`${API_BASE_URL}/api/movies/library`);
  },

  // Update movie rating
  updateRating: async (movieId, rating) => {
    return fetchWithAuth(`${API_BASE_URL}/api/movies/${movieId}/rating`, {
      method: 'PUT',
      body: JSON.stringify({ rating }),
    });
  },

  // Delete movie from library
  deleteMovie: async (movieId) => {
    return fetchWithAuth(`${API_BASE_URL}/api/movies/${movieId}`, {
      method: 'DELETE',
    });
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
    // Convert frontend position (0-3) to backend position (1-4)
    const backendPosition = position + 1;
    
    return fetchWithAuth(`${API_BASE_URL}/api/movies/showcase/${backendPosition}`, {
      method: 'PUT',
      body: JSON.stringify({ movie_id: movieId }),
    });
  },

  // Remove movie from showcase position
  removeShowcasePosition: async (position) => {
    // Convert frontend position (0-3) to backend position (1-4)
    const backendPosition = position + 1;
    
    return fetchWithAuth(`${API_BASE_URL}/api/movies/showcase/${backendPosition}`, {
      method: 'DELETE',
    });
  },

  // ===== WATCHLIST ENDPOINTS =====
  
  // Get user's watchlist
  getWatchlist: async () => {
    return fetchWithAuth(`${API_BASE_URL}/api/movies/watchlist`);
  },

  // Add movie to watchlist (with caching)
  addToWatchlist: async (movieId, movieDetails = null) => {
    // Cache movie details first if provided
    if (movieDetails) {
      await movieApi.cacheMovie(movieDetails);
    }
    
    return fetchWithAuth(`${API_BASE_URL}/api/movies/watchlist/add`, {
      method: 'POST',
      body: JSON.stringify({ movie_id: movieId }),
    });
  },

  // Remove movie from watchlist
  removeFromWatchlist: async (movieId) => {
    return fetchWithAuth(`${API_BASE_URL}/api/movies/watchlist/${movieId}`, {
      method: 'DELETE',
    });
  },

  // Check if movie is in watchlist
  checkWatchlist: async (movieId) => {
    return fetchWithAuth(`${API_BASE_URL}/api/movies/watchlist/check/${movieId}`);
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
        adult: movieDetails.adult || false,
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
