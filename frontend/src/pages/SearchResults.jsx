import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getMovieUrl, getPersonUrl } from '../utils/urlUtils';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      try {
        setLoading(true);
        setError(null);

        const [moviesRes, peopleRes] = await Promise.all([
          fetch(`${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`),
          fetch(`${TMDB_BASE_URL}/search/person?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`)
        ]);

        if (!moviesRes.ok || !peopleRes.ok) {
          throw new Error('Search failed');
        }

        const moviesData = await moviesRes.json();
        const peopleData = await peopleRes.json();

        const movies = moviesData.results
          .filter(movie => movie.poster_path)
          .slice(0, 20)
          .map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
            poster: movie.poster_path ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}` : null,
            type: 'movie',
            overview: movie.overview,
            rating: movie.vote_average
          }));

        const people = peopleData.results
          .filter(person => person.profile_path)
          .slice(0, 20)
          .map(person => ({
            id: person.id,
            name: person.name,
            knownFor: person.known_for_department,
            poster: person.profile_path ? `${TMDB_IMAGE_BASE}/w500${person.profile_path}` : null,
            type: 'person',
            knownForTitles: person.known_for?.map(item => item.title || item.name).slice(0, 2).join(', ')
          }));

        // Combine and sort by relevance (movies first, then people)
        const combined = [...movies, ...people];
        setResults(combined);
      } catch (err) {
        setError('Failed to search. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  const handleResultClick = (result) => {
    if (result.type === 'movie') {
      navigate(getMovieUrl(result.id, result.title));
    } else {
      navigate(getPersonUrl(result.id, result.name));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <Navbar loggedIn={true} />
      
      <div className="flex-1 overflow-y-auto search-results-scroll" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--cm-scrollbar-thumb) var(--cm-scrollbar-track)'
      }}>
        <div className="min-h-full text-slate-50 px-6 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition mb-4 group"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Go Back
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <Search className="w-8 h-8 text-blue-500" />
                <h1 className="text-4xl font-bold text-slate-50">
                  Search Results
                </h1>
              </div>
              <p className="text-slate-400 ml-11">
                {query ? `Showing results for "${query}"` : 'Enter a search query'}
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-slate-900/60 border border-blue-500/40 rounded-lg p-6">
                <p className="text-slate-100">{error}</p>
              </div>
            )}

            {/* Results */}
            {!loading && !error && results.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="flex gap-4 border border-slate-800 rounded-lg p-4 hover:border-blue-500/50 hover:bg-slate-900/50 transition group text-left"
                  >
                    {/* Poster/Profile Image */}
                    <div className="flex-shrink-0">
                      {result.poster ? (
                        <img
                          src={result.poster}
                          alt={result.title || result.name}
                          className="w-24 h-36 object-cover rounded ring-1 ring-slate-700 group-hover:ring-blue-500/50 transition"
                        />
                      ) : (
                        <div className="w-24 h-36 bg-slate-700 rounded flex items-center justify-center">
                          <span className="text-slate-500 text-xs">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-slate-50 group-hover:text-blue-500 transition mb-1">
                            {result.type === 'movie' ? result.title : result.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-slate-200">
                              {result.type === 'movie' ? 'Movie' : 'Person'}
                            </span>
                            {result.type === 'movie' && result.year && (
                              <span>{result.year}</span>
                            )}
                            {result.type === 'person' && result.knownFor && (
                              <span>{result.knownFor}</span>
                            )}
                            {result.type === 'movie' && result.rating > 0 && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4 fill-amber-400" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {result.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {result.type === 'movie' && result.overview && (
                        <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                          {result.overview}
                        </p>
                      )}

                      {result.type === 'person' && result.knownForTitles && (
                        <p className="text-sm text-slate-400">
                          Known for: {result.knownForTitles}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && !error && query && results.length === 0 && (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">No results found</h3>
                <p className="text-slate-500">Try searching with different keywords</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && !query && (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">Start searching</h3>
                <p className="text-slate-500">Use the search bar above to find movies and people</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />

    </div>
  );
}
