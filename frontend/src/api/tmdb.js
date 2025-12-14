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
      console.log('Using cached upcoming movies');
      return cache.upcoming.data;
    }

    try {
      console.log('Fetching upcoming movies from TMDB...');
      
      // Fetch first page only with US region
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=en-US&page=1&region=US`
      );
      
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }
      
      const data = await response.json();
      const allResults = data.results;
      
      // Filter for movies releasing within next 3 months (exclude animation)
      const now = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      
      const upcomingFiltered = allResults.filter(movie => {
        if (!movie.release_date) return false;
        const releaseDate = new Date(movie.release_date);
        const isAnimated = movie.genre_ids && movie.genre_ids.includes(16); // 16 is Animation genre
        return releaseDate > now && releaseDate < threeMonthsFromNow && !isAnimated;
      });

      // Get cast info AND US release dates for filtered movies
      const moviesWithCastData = await Promise.allSettled(
        upcomingFiltered.slice(0, 25).map(async (movie) => {
          try {
            const [creditsRes, releaseDatesRes] = await Promise.all([
              fetch(`${TMDB_BASE_URL}/movie/${movie.id}/credits?api_key=${API_KEY}`),
              fetch(`${TMDB_BASE_URL}/movie/${movie.id}/release_dates?api_key=${API_KEY}`)
            ]);
            
            let cast = [];
            let director = 'TBA';
            let castPopularity = 0;
            
            if (creditsRes.ok) {
              const credits = await creditsRes.json();
              cast = credits.cast || [];
              const directorObj = credits.crew?.find(person => person.job === 'Director');
              director = directorObj?.name || 'TBA';
              
              // Calculate total cast popularity (sum of top 3 cast members)
              castPopularity = cast
                .slice(0, 3)
                .reduce((sum, actor) => sum + (actor.popularity || 0), 0);
            }
            
            // Get US theatrical release date
            let usReleaseDate = movie.release_date;
            if (releaseDatesRes.ok) {
              const releaseDates = await releaseDatesRes.json();
              const usRelease = releaseDates.results?.find(r => r.iso_3166_1 === 'US');
              
              if (usRelease && usRelease.release_dates && usRelease.release_dates.length > 0) {
                const allReleases = usRelease.release_dates;
                
                // Get earliest type 3 (wide theatrical) date
                const theatrical = allReleases
                  .filter(d => d.type === 3)
                  .sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
                
                if (theatrical.length > 0) {
                  usReleaseDate = theatrical[0].release_date.split('T')[0];
                } else {
                  // Fallback to limited or premiere
                  const limited = allReleases.filter(d => d.type === 2)
                    .sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
                  const premiere = allReleases.filter(d => d.type === 1)
                    .sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
                  
                  if (limited.length > 0) {
                    usReleaseDate = limited[0].release_date.split('T')[0];
                  } else if (premiere.length > 0) {
                    usReleaseDate = premiere[0].release_date.split('T')[0];
                  }
                }
              }
            }
            
            return {
              movie: {
                ...movie,
                release_date: usReleaseDate
              },
              cast,
              director,
              castPopularity
            };
          } catch (err) {
            console.warn(`Failed to fetch data for ${movie.title}`);
            return { movie, cast: [], director: 'TBA', castPopularity: 0 };
          }
        })
      );

      const allMoviesData = moviesWithCastData
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      // Composite scoring: base popularity + cast popularity + English language boost
      const moviesWithScores = allMoviesData.map(data => {
        const baseScore = (data.movie.popularity || 0) * 0.6 + (data.castPopularity || 0) * 0.4;
        const languageMultiplier = data.movie.original_language === 'en' ? 1.9 : 1.0;
        const compositeScore = baseScore * languageMultiplier;
        
        return {
          ...data,
          compositeScore,
          baseScore
        };
      });
      
      // Sort by composite score and take top 10 for full page
      const selectedMovies = moviesWithScores
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, 10);
      
      // Transform to final format
      const finalMovies = selectedMovies.map(data => ({
        id: data.movie.id,
        title: data.movie.title,
        date: formatReleaseDate(data.movie.release_date),
        director: data.director,
        poster: data.movie.poster_path 
          ? `${TMDB_IMAGE_BASE}/original${data.movie.poster_path}` 
          : null,
        year: data.movie.release_date ? new Date(data.movie.release_date).getFullYear() : null,
        popularity: data.movie.popularity
      }));

      // Store in cache
      cache.upcoming = {
        data: finalMovies,
        timestamp: Date.now()
      };

      return finalMovies;
    } catch (error) {
      console.error('Failed to fetch upcoming movies:', error);
      
      // If we have stale cache data, return it as fallback
      if (cache.upcoming.data) {
        console.log('Using stale cache as fallback');
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
      console.log('Using cached popular movies');
      return cache.popular.data;
    }

    try {
      console.log('Fetching popular movies from TMDB...');
      
      // Calculate date range: 3 months ago from 1st to yesterday
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
      fourMonthsAgo.setDate(1);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const startDate = fourMonthsAgo.toISOString().split('T')[0];
      const endDate = yesterday.toISOString().split('T')[0];
      
      console.log(`Fetching movies from ${startDate} to ${endDate}`);
      
      // Use discover API with date filters and quality thresholds (exclude animation)
      // SORT BY VOTE_AVERAGE (user rating/score) instead of popularity
      const response = await fetch(
        `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&region=US&with_original_language=en&sort_by=vote_average.desc&primary_release_date.gte=${startDate}&primary_release_date.lte=${endDate}&vote_average.gte=6&vote_count.gte=500&without_genres=16&page=1`
      );
      
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log(`Found ${data.results.length} popular movies, already sorted by vote_average`);
      
      // Take top 10 by vote_average (user score) - already sorted by API
      const popularFiltered = data.results.slice(0, 10);

      // Get director info for each movie
      const moviesWithDetails = await Promise.allSettled(
        popularFiltered.map(async (movie) => {
          let director = 'TBA';
          
          try {
            const creditsRes = await fetch(
              `${TMDB_BASE_URL}/movie/${movie.id}/credits?api_key=${API_KEY}`
            );
            
            if (creditsRes.ok) {
              const credits = await creditsRes.json();
              const directorObj = credits.crew?.find(person => person.job === 'Director');
              if (directorObj) {
                director = directorObj.name;
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch director for ${movie.title}`);
          }
          
          return {
            id: movie.id,
            title: movie.title,
            date: formatReleaseDate(movie.release_date),
            director: director,
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

      console.log('Popular movies sorted by user rating:', successfulMovies.map(m => ({
        title: m.title,
        rating: m.rating
      })));

      // Store in cache (already sorted by rating from API)
      cache.popular = {
        data: successfulMovies,
        timestamp: Date.now()
      };

      return successfulMovies;
    } catch (error) {
      console.error('Failed to fetch popular movies:', error);
      
      if (cache.popular.data) {
        console.log('Using stale cache as fallback');
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
      console.log('Using cached trending people');
      return cache.trending.data;
    }

    try {
      console.log('Fetching trending people from TMDB...');
      const res = await fetch(
        `${TMDB_BASE_URL}/trending/person/week?api_key=${API_KEY}`
      );

      if (!res.ok) {
        throw new Error(`TMDB API error: ${res.status}`);
      }

      const data = await res.json();
      
      // Get detailed credits for each person
      const peopleWithCredits = await Promise.allSettled(
        data.results
          .filter(person => person.profile_path)
          .slice(0, 8) // Get 8 to have extras in case some fail
          .map(async (person) => {
            try {
              // Fetch their movie credits
              const creditsRes = await fetch(
                `${TMDB_BASE_URL}/person/${person.id}/movie_credits?api_key=${API_KEY}`
              );
              
              if (!creditsRes.ok) {
                throw new Error(`Failed to fetch credits for ${person.name}`);
              }
              
              const credits = await creditsRes.json();
              const castMovies = credits.cast || [];
              
              if (castMovies.length === 0) {
                return null;
              }
              
              // Sort by popularity to get top movies
              const sortedByPopularity = [...castMovies]
                .filter(movie => movie.title && movie.popularity)
                .sort((a, b) => b.popularity - a.popularity);
              
              // Sort by release date to get most recent
              const sortedByDate = [...castMovies]
                .filter(movie => movie.title && movie.release_date)
                .sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
              
              // Get top 5 popular movies, then pick 2 randomly for variety
              const topPopular = sortedByPopularity.slice(0, 5);
              const selectedPopular = [];
              
              if (topPopular.length > 0) {
                // First popular movie
                selectedPopular.push(topPopular[0]);
                
                // Second popular movie (random from top 2-5)
                if (topPopular.length > 1) {
                  const randomIndex = Math.floor(Math.random() * Math.min(4, topPopular.length - 1)) + 1;
                  selectedPopular.push(topPopular[randomIndex]);
                }
              }
              
              // Get most recent movie
              const recentMovie = sortedByDate[0];
              
              // Combine: 2 popular + 1 recent (if recent isn't already in popular)
              const notableMovies = [...selectedPopular];
              if (recentMovie && !selectedPopular.find(m => m.id === recentMovie.id)) {
                notableMovies.push(recentMovie);
              }
              
              // Format notable works
              const notableWorks = notableMovies
                .slice(0, 2) // Show max 2 titles
                .map(movie => movie.title)
                .join(', ');
              
              return {
                id: person.id,
                name: person.name,
                role: person.known_for_department === 'Acting' ? 'Actor' : 'Director',
                notableWork: notableWorks || 'Various works',
                poster: `${TMDB_IMAGE_BASE}/w500${person.profile_path}`
              };
            } catch (err) {
              console.warn(`Failed to fetch credits for ${person.name}:`, err);
              return null;
            }
          })
      );
      
      // Extract successful results only
      const transformedData = peopleWithCredits
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value)
        .slice(0, 5);

      // Store in cache
      cache.trending = {
        data: transformedData,
        timestamp: Date.now()
      };

      return transformedData;
    } catch (error) {
      console.error('Failed to fetch trending people:', error);
      
      // If we have stale cache data, return it as fallback
      if (cache.trending.data) {
        console.log('Using stale cache as fallback');
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
    console.log('Cache cleared');
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
  }
};