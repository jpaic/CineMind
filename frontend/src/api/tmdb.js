// frontend/src/api/tmdb.js
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

// Cache configuration
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

// Cache storage
const cache = {
  upcoming: { data: null, timestamp: null },
  trending: { data: null, timestamp: null },
  popular: { data: null, timestamp: null }
};

// Helper to check if cache is valid
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry.data || !cacheEntry.timestamp) return false;
  return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
};

// Helper to format date
const formatReleaseDate = (dateString) => {
  if (!dateString) return 'TBA';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Helper to get notable works from known_for array
const getNotableWorks = (knownFor) => {
  if (!knownFor || knownFor.length === 0) return 'Various works';
  
  // Sort by popularity and get top 2
  const sortedWorks = knownFor
    .filter(work => work.title || work.name)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 2);
  
  if (sortedWorks.length === 0) return 'Various works';
  
  return sortedWorks
    .map(work => work.title || work.name)
    .join(', ');
};

export const tmdbService = {
  // Get upcoming movies (highly anticipated and popular) - FULL VERSION (10 movies)
  getUpcoming: async () => {
    // Check cache first
    if (isCacheValid(cache.upcoming)) {
      return cache.upcoming.data;
    }

    try {
      const now = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      const startDate = now.toISOString().split('T')[0];
      const endDate = threeMonthsFromNow.toISOString().split('T')[0];

      const response = await fetch(
        `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&region=US&with_original_language=en&sort_by=popularity.desc&primary_release_date.gte=${startDate}&primary_release_date.lte=${endDate}&with_release_type=3|2&include_adult=false&without_genres=16&page=1`
      );

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }

      const data = await response.json();
      const upcomingFiltered = (data.results || []).filter(movie => {
        if (!movie.release_date) return false;
        const releaseDate = new Date(movie.release_date);
        return releaseDate >= now && releaseDate <= threeMonthsFromNow;
      });

      const moviesWithCastData = await Promise.allSettled(
        upcomingFiltered.slice(0, 20).map(async (movie) => {
          try {
            const creditsRes = await fetch(
              `${TMDB_BASE_URL}/movie/${movie.id}/credits?api_key=${API_KEY}`
            );

            let cast = [];
            let director = 'TBA';
            let directorId = null;
            let castPopularity = 0;

            if (creditsRes.ok) {
              const credits = await creditsRes.json();
              cast = credits.cast || [];
              const directorObj = credits.crew?.find(person => person.job === 'Director');
              director = directorObj?.name || 'TBA';
              directorId = directorObj?.id || null;

              castPopularity = cast
                .slice(0, 3)
                .reduce((sum, actor) => sum + (actor.popularity || 0), 0);
            }

            return {
              movie,
              cast,
              director,
              directorId,
              castPopularity
            };
          } catch (err) {
            return { movie, cast: [], director: 'TBA', directorId: null, castPopularity: 0 };
          }
        })
      );

      const allMoviesData = moviesWithCastData
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      const moviesWithScores = allMoviesData.map(data => {
        const baseScore = (data.movie.popularity || 0) * 0.6 + (data.castPopularity || 0) * 0.4;
        const compositeScore = baseScore * 1.9;

        return {
          ...data,
          compositeScore,
          baseScore
        };
      });

      const selectedMovies = moviesWithScores
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, 10);

      const finalMovies = selectedMovies.map(data => ({
        id: data.movie.id,
        title: data.movie.title,
        date: formatReleaseDate(data.movie.release_date),
        director: data.director,
        directorId: data.directorId,
        poster: data.movie.poster_path 
          ? `${TMDB_IMAGE_BASE}/original${data.movie.poster_path}` 
          : null,
        year: data.movie.release_date ? new Date(data.movie.release_date).getFullYear() : null,
        popularity: data.movie.popularity
      }));

      cache.upcoming = {
        data: finalMovies,
        timestamp: Date.now()
      };

      return finalMovies;
    } catch (error) {
      if (cache.upcoming.data) {
        return cache.upcoming.data;
      }

      return [];
    }
  },

  // Get upcoming movies for homepage showcase (4 movies only)
  getUpcomingShowcase: async () => {
    const allMovies = await tmdbService.getUpcoming();
    return allMovies.slice(0, 4);
  },

  // Get popular movies (currently in theaters and streaming) - FULL VERSION (10 movies)
  getPopular: async () => {
    // Check cache first
    if (isCacheValid(cache.popular)) {
      return cache.popular.data;
    }

    try {
      
      // Calculate date range: 3 months ago from 1st to yesterday
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
      fourMonthsAgo.setDate(1);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const startDate = fourMonthsAgo.toISOString().split('T')[0];
      const endDate = yesterday.toISOString().split('T')[0];
      
      
      // Use discover API with date filters and quality thresholds (exclude animation)
      // SORT BY VOTE_AVERAGE (user rating/score) instead of popularity
      const response = await fetch(
        `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&region=US&with_original_language=en&sort_by=vote_average.desc&primary_release_date.gte=${startDate}&primary_release_date.lte=${endDate}&vote_average.gte=6&vote_count.gte=500&without_genres=16&page=1`
      );
      
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      
      // Take top 10 by vote_average (user score) - already sorted by API
      const popularFiltered = data.results.slice(0, 10);

      // Get director info for each movie
      const moviesWithDetails = await Promise.allSettled(
        popularFiltered.map(async (movie) => {
          let director = 'TBA';
          let directorId = null;
          
          try {
            const creditsRes = await fetch(
              `${TMDB_BASE_URL}/movie/${movie.id}/credits?api_key=${API_KEY}`
            );
            
            if (creditsRes.ok) {
              const credits = await creditsRes.json();
              const directorObj = credits.crew?.find(person => person.job === 'Director');
              if (directorObj) {
                director = directorObj.name;
                directorId = directorObj.id;
              }
            }
          } catch (err) {
            // Ignore credit fetch failures and fall back to defaults.
          }
          
          return {
            id: movie.id,
            title: movie.title,
            date: formatReleaseDate(movie.release_date),
            director: director,
            directorId: directorId,
            poster: movie.poster_path 
              ? `${TMDB_IMAGE_BASE}/original${movie.poster_path}` 
              : null,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
            popularity: movie.popularity,
            rating: movie.vote_average
          };
        })
      );

      const successfulMovies = moviesWithDetails
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      // Store in cache (already sorted by rating from API)
      cache.popular = {
        data: successfulMovies,
        timestamp: Date.now()
      };

      return successfulMovies;
    } catch (error) {
      
      if (cache.popular.data) {
        return cache.popular.data;
      }
      
      return [];
    }
  },

  // Get popular movies for homepage showcase (4 movies only)
  getPopularShowcase: async () => {
    const allMovies = await tmdbService.getPopular();
    return allMovies.slice(0, 4);
  },

  // Get trending people (actors/directors)
  getTrendingPeople: async () => {
    // Check cache first
    if (isCacheValid(cache.trending)) {
      return cache.trending.data;
    }

    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/person/popular?api_key=${API_KEY}&language=en-US&page=1`
      );

      if (!res.ok) {
        throw new Error(`TMDB API error: ${res.status}`);
      }

      const data = await res.json();

      const filteredPeople = (data.results || [])
        .filter(person => person.profile_path)
        .filter(person => ['Acting', 'Directing'].includes(person.known_for_department))
        .filter(person => {
          const knownFor = person.known_for || [];
          return knownFor.some(item => item.media_type === 'movie' && !item.adult && item.original_language === 'en');
        });

      const peopleWithCredits = await Promise.allSettled(
        filteredPeople.slice(0, 10).map(async (person) => {
          try {
            const creditsRes = await fetch(
              `${TMDB_BASE_URL}/person/${person.id}/movie_credits?api_key=${API_KEY}`
            );

            if (!creditsRes.ok) {
              throw new Error(`Failed to fetch credits for ${person.name}`);
            }

            const credits = await creditsRes.json();
            const castMovies = credits.cast || [];

            const englishMovies = castMovies.filter(
              movie => movie.title && movie.original_language === 'en' && !movie.adult
            );

            if (englishMovies.length === 0) {
              return null;
            }

            const notableWorks = getNotableWorks(englishMovies);

            return {
              id: person.id,
              name: person.name,
              role: person.known_for_department === 'Acting' ? 'Actor' : 'Director',
              notableWork: notableWorks || 'Various works',
              poster: `${TMDB_IMAGE_BASE}/w500${person.profile_path}`
            };
          } catch (err) {
            return null;
          }
        })
      );

      const transformedData = peopleWithCredits
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value)
        .slice(0, 5);

      cache.trending = {
        data: transformedData,
        timestamp: Date.now()
      };

      return transformedData;
    } catch (error) {
      if (cache.trending.data) {
        return cache.trending.data;
      }

      return [];
    }
  },

  // Helper: Get image URL
  getImageUrl: (path, size = 'w500') => {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  },

  // Helper: Clear cache manually (useful for refresh functionality)
  clearCache: () => {
    cache.upcoming = { data: null, timestamp: null };
    cache.trending = { data: null, timestamp: null };
    cache.popular = { data: null, timestamp: null };
  },

  // Helper: Get cache status (for debugging)
  getCacheStatus: () => {
    return {
      upcoming: {
        cached: !!cache.upcoming.data,
        valid: isCacheValid(cache.upcoming),
        age: cache.upcoming.timestamp 
          ? Math.floor((Date.now() - cache.upcoming.timestamp) / 1000) 
          : null
      },
      trending: {
        cached: !!cache.trending.data,
        valid: isCacheValid(cache.trending),
        age: cache.trending.timestamp 
          ? Math.floor((Date.now() - cache.trending.timestamp) / 1000) 
          : null
      },
      popular: {
        cached: !!cache.popular.data,
        valid: isCacheValid(cache.popular),
        age: cache.popular.timestamp 
          ? Math.floor((Date.now() - cache.popular.timestamp) / 1000) 
          : null
      }
    };
  },

  searchMovies: async (query) => {
      try {
        const response = await fetch(
          `${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US`
        );
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        
        return data.results.map(movie => ({
          id: movie.id,
          title: movie.title,
          year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
          poster: movie.poster_path 
            ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}` 
            : null,
          overview: movie.overview,
        }));
      } catch (error) {
        return [];
      }
    },
  
    // Get detailed movie information
    getMovieDetails: async (movieId) => {
      try {
        const [movieRes, creditsRes] = await Promise.all([
          fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=en-US`),
          fetch(`${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`)
        ]);
  
        if (!movieRes.ok || !creditsRes.ok) throw new Error('Failed to fetch movie details');
  
        const movie = await movieRes.json();
        const credits = await creditsRes.json();
  
        const director = credits.crew?.find(person => person.job === 'Director');
  
        return {
          id: movie.id,
          title: movie.title,
          year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
          poster: movie.poster_path 
            ? `${TMDB_IMAGE_BASE}/original${movie.poster_path}` 
            : null,
          director: director?.name || 'Unknown',
          directorId: director?.id || null,
          genres: movie.genres?.map(g => g.name) || [],
          overview: movie.overview,
          runtime: movie.runtime,
          releaseDate: movie.release_date,
        };
      } catch (error) {
        return null;
      }
    },
  
    // Get multiple movie details at once (for enriching user library)
    getMoviesDetails: async (movieIds) => {
      try {
        const moviePromises = movieIds.map(id => tmdbService.getMovieDetails(id));
        const results = await Promise.allSettled(moviePromises);
        
        return results
          .filter(result => result.status === 'fulfilled' && result.value !== null)
          .map(result => result.value);
      } catch (error) {
        return [];
      }
    },
  
    // Get image URL helper
    getImageUrl: (path, size = 'w500') => {
      if (!path) return null;
      return `${TMDB_IMAGE_BASE}/${size}${path}`;
    },
};
