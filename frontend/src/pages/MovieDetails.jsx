import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Calendar, Clock, Film, Bookmark, BookmarkCheck } from 'lucide-react';
import { getPersonUrl } from '../utils/urlUtils';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { movieApi } from '../api/movieApi';
import { authUtils } from '../utils/authUtils';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export default function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [credits, setCredits] = useState({ cast: [], crew: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const [movieRes, creditsRes] = await Promise.all([
          fetch(`${TMDB_BASE_URL}/movie/${id}?api_key=${API_KEY}&language=en-US`),
          fetch(`${TMDB_BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`)
        ]);

        if (!movieRes.ok || !creditsRes.ok) {
          throw new Error('Failed to fetch movie details');
        }

        const movieData = await movieRes.json();
        const creditsData = await creditsRes.json();

        setMovie(movieData);
        setCredits(creditsData);

        if (authUtils.isAuthenticated()) {
          const [watchlistRes, libraryRes] = await Promise.allSettled([
            movieApi.checkWatchlist(id),
            movieApi.getLibrary(2000, 0),
          ]);

          if (watchlistRes.status === 'fulfilled') {
            setIsInWatchlist(Boolean(watchlistRes.value?.inWatchlist));
          }

          if (libraryRes.status === 'fulfilled' && libraryRes.value?.movies) {
            const ratedMovie = libraryRes.value.movies.find(
              (libraryMovie) => Number(libraryMovie.movie_id) === Number(id)
            );
            if (ratedMovie?.rating) {
              setUserRating(Number(ratedMovie.rating));
            }
          }
        }
      } catch {
        setError('Failed to load movie details');
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetails();
  }, [id]);

  const saveRating = async (rating) => {
    if (!movie || isSavingRating) {
      return;
    }

    setIsSavingRating(true);
    setActionError(null);

    try {
      if (userRating > 0) {
        await movieApi.updateRating(movie.id, rating);
      } else {
        const director = credits.crew.find((person) => person.job === 'Director');
        await movieApi.addMovie(movie.id, rating, new Date(), {
          id: movie.id,
          title: movie.title,
          year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
          poster: movie.poster_path ? `${TMDB_IMAGE_BASE}/original${movie.poster_path}` : null,
          director: director?.name || 'Unknown',
          directorId: director?.id || null,
          genres: movie.genres?.map((genre) => genre.name) || [],
        });
      }

      setUserRating(rating);
    } catch (err) {
      setActionError(err.message || 'Unable to save your rating right now.');
    } finally {
      setIsSavingRating(false);
    }
  };

  const toggleWatchlist = async () => {
    if (!movie || isTogglingWatchlist) {
      return;
    }

    setIsTogglingWatchlist(true);
    setActionError(null);

    try {
      if (isInWatchlist) {
        await movieApi.removeFromWatchlist(movie.id);
        setIsInWatchlist(false);
      } else {
        const director = credits.crew.find((person) => person.job === 'Director');
        await movieApi.addToWatchlist(movie.id, {
          id: movie.id,
          title: movie.title,
          year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
          poster: movie.poster_path ? `${TMDB_IMAGE_BASE}/original${movie.poster_path}` : null,
          director: director?.name || 'Unknown',
          directorId: director?.id || null,
          genres: movie.genres?.map((genre) => genre.name) || [],
        });
        setIsInWatchlist(true);
      }
    } catch (err) {
      setActionError(err.message || 'Unable to update your watchlist right now.');
    } finally {
      setIsTogglingWatchlist(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-950">
        <Navbar loggedIn={true} />
        <div className="flex-1 flex items-center justify-center text-slate-50">
          <div className="cm-spinner animate-spin rounded-full h-12 w-12"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-950">
        <Navbar loggedIn={true} />
        <div className="flex-1 overflow-y-auto app-scroll">
          <div className="min-h-full bg-slate-950 text-slate-50 px-6 py-12">
            <div className="max-w-7xl mx-auto">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition mb-6"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Go Back
              </button>
              <div className="bg-slate-900/60 border border-blue-500/40 rounded-lg p-6">
                <p className="text-slate-100">{error || 'Movie not found'}</p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const director = credits.crew.find(person => person.job === 'Director');
  const fullCast = credits.cast;

  const renderStars = (rating) => {
    const stars = Math.round(rating / 2);
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i < stars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-950">
      <Navbar loggedIn={true} />
      
      <div className="flex-1 overflow-y-auto app-scroll">
        <div className="min-h-full bg-slate-950 text-slate-50">
          {/* Backdrop */}
          {movie.backdrop_path && (
            <div className="relative w-full h-96 overflow-hidden">
              <img
                src={`${TMDB_IMAGE_BASE}/original${movie.backdrop_path}`}
                alt={movie.title}
                className="w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-6 py-8 -mt-64 relative z-10">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition mb-6 group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Go Back
            </button>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Poster */}
              <div className="flex-shrink-0">
                {movie.poster_path ? (
                  <img
                    src={`${TMDB_IMAGE_BASE}/w500${movie.poster_path}`}
                    alt={movie.title}
                    className="w-64 rounded-lg shadow-2xl ring-1 ring-slate-700"
                  />
                ) : (
                  <div className="w-64 h-96 bg-slate-800 rounded-lg flex items-center justify-center">
                    <Film className="w-16 h-16 text-slate-600" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2 text-slate-50">
                  {movie.title}
                </h1>
                
                {movie.tagline && (
                  <p className="text-slate-400 italic mb-4">{movie.tagline}</p>
                )}

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">
                      {movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA'}
                    </span>
                  </div>
                  
                  {movie.runtime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">{movie.runtime} min</span>
                    </div>
                  )}

                  {movie.vote_average > 0 && (
                    <div className="flex items-center gap-2">
                      {renderStars(movie.vote_average)}
                      <span className="text-sm font-semibold">{movie.vote_average.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Genres */}
                {movie.genres && movie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {movie.genres.map(genre => (
                      <span
                        key={genre.id}
                        className="px-3 py-1 bg-slate-800 border border-blue-500/30 rounded-full text-sm"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Director */}
                {director && (
                  <div className="mb-6">
                    <h3 className="text-sm text-slate-400 mb-1">Directed by</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(getPersonUrl(director.id, director.name));
                      }}
                      className="text-lg font-semibold text-blue-500 hover:text-slate-200 transition hover:underline"
                    >
                      {director.name}
                    </button>
                  </div>
                )}

                {/* Overview */}
                {movie.overview && (
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2">Overview</h3>
                    <p className="text-slate-300 leading-relaxed">{movie.overview}</p>
                  </div>
                )}

                {/* User Actions */}
                <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-300 mb-3">Your actions</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                        <button
                          key={star}
                          onClick={() => saveRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-125 active:scale-95"
                          disabled={isSavingRating}
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= (hoverRating || userRating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-slate-200 font-semibold min-w-12">
                        {(hoverRating || userRating) > 0 ? `${hoverRating || userRating}/10` : 'Rate'}
                      </span>
                    </div>

                    <button
                      onClick={toggleWatchlist}
                      disabled={isTogglingWatchlist}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-700 bg-slate-800 hover:border-blue-500/60 hover:text-slate-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isInWatchlist ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                    </button>
                  </div>

                  {actionError && (
                    <p className="text-slate-100 text-sm mt-3">{actionError}</p>
                  )}
                </div>

                {/* Production Companies */}
                {movie.production_companies && movie.production_companies.length > 0 && (
                  <div>
                    <h3 className="text-sm text-slate-400 mb-2">Production</h3>
                    <div className="flex flex-wrap gap-2">
                      {movie.production_companies.map(company => (
                        <span key={company.id} className="text-sm text-slate-300">
                          {company.name}
                        </span>
                      )).reduce((prev, curr) => [prev, ' • ', curr])}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cast */}
            {fullCast.length > 0 && (
              <div className="mt-12 mb-12">
                <h2 className="text-2xl font-bold mb-6 text-slate-50">
                  Cast
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {fullCast.map(person => (
                    <button
                      key={person.id}
                      onClick={() => navigate(getPersonUrl(person.id, person.name))}
                      className="group text-left"
                    >
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-slate-900 ring-1 ring-slate-700 hover:ring-blue-500/50 transition-all mb-2 group-hover:scale-105">
                        {person.profile_path ? (
                          <img
                            src={`${TMDB_IMAGE_BASE}/w500${person.profile_path}`}
                            alt={person.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 text-2xl font-bold">
                              {person.name.charAt(0)}
                            </div>
                          </div>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm group-hover:text-blue-500 transition truncate">
                        {person.name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">{person.character}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
