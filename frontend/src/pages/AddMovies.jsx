import React, { useState, useEffect } from 'react';
import { X, Search, Star, Loader, CalendarDays, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { tmdbService } from '../api/tmdb';
import { movieApi } from '../api/movieApi';
import { authUtils } from '../utils/authUtils';

const DEMO_READ_ONLY_MESSAGE = 'Demo mode is read-only. Sign in with a real account to import or save movies.';

const normalizeHeader = (value = '') => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const toFivePointRating = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const percentageMatch = raw.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (percentageMatch) {
    const asTenPoint = Number(percentageMatch[1]) / 10;
    return Number.isFinite(asTenPoint) ? Math.min(5, Math.max(0.5, Math.round(asTenPoint * 2) / 2)) : null;
  }

  const fractionMatch = raw.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }
    return Math.min(5, Math.max(0.5, Math.round((numerator / denominator) * 10) / 2));
  }

  const normalized = raw.replace(/★/g, '');
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (numeric <= 5) {
    return Math.min(5, Math.max(0.5, Math.round(numeric * 2) / 2));
  }

  return Math.min(5, Math.max(0.5, Math.round(numeric) / 2));
};


const normalizeImdbId = (value) => {
  if (!value) {
    return null;
  }

  const match = String(value).trim().match(/tt\d{6,}/i);
  return match ? match[0].toLowerCase() : null;
};

const parseTmdbId = (value) => {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
};

const parseWatchedDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const isoLike = new Date(raw);
  if (!Number.isNaN(isoLike.getTime())) {
    return isoLike;
  }

  const dmyMatch = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1800) {
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
};

const parseImportCsv = (csvText) => {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: '',
    transformHeader: (header) => normalizeHeader(header),
  });

  if (parsed.errors?.length) {
    // Non-fatal parse errors are common in CSV exports; continue with parsed rows.
  }

  const rows = Array.isArray(parsed.data) ? parsed.data : [];
  if (rows.length === 0) {
    return [];
  }

  const headerValues = Object.keys(rows[0] || {});

  const findHeaderIndex = (...keys) => {
    for (const key of keys) {
      const index = headerValues.indexOf(normalizeHeader(key));
      if (index >= 0) {
        return index;
      }
    }
    return -1;
  };

  const titleIndex = findHeaderIndex('Name', 'Title', 'Film', 'Movie', 'Original Title', 'Primary Title');
  const yearIndex = findHeaderIndex('Year', 'Released', 'Release Year');
  const ratingIndex = findHeaderIndex('Rating', 'Your Rating', 'Personal Rating');
  const watchedDateIndex = findHeaderIndex('Watched Date', 'Date', 'Date Rated', 'WatchedDate');
  const tmdbIdIndex = findHeaderIndex('TMDB ID', 'TMDBID', 'tmdbID', 'tmdb id');
  const imdbIdIndex = findHeaderIndex('IMDb ID', 'IMDB ID', 'Const', 'imdbID', 'IMDb');

  if (titleIndex < 0 || ratingIndex < 0) {
    return [];
  }

  return rows.map((values) => {
    const getValue = (index) => {
      if (index < 0) return null;
      const key = headerValues[index];
      return key ? values[key] : null;
    };

    return {
      title: String(getValue(titleIndex) || '').replace(/^"|"$/g, '').trim(),
      year: getValue(yearIndex) ? Number(getValue(yearIndex)) || null : null,
      rating: toFivePointRating(getValue(ratingIndex)),
      watchedDate: parseWatchedDate(getValue(watchedDateIndex)),
      tmdbId: tmdbIdIndex >= 0 ? parseTmdbId(getValue(tmdbIdIndex)) : null,
      imdbId: imdbIdIndex >= 0 ? normalizeImdbId(getValue(imdbIdIndex)) : null,
    };
  }).filter((entry) => entry.title && entry.rating && entry.rating > 0);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeTitleForMatch = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');

const getExactTitleMatches = (entry, results) => {
  const targetTitle = normalizeTitleForMatch(entry.title);
  if (!targetTitle) return [];

  return results.filter((movie) => {
    const normalizedTitle = normalizeTitleForMatch(movie.title);
    const normalizedOriginalTitle = normalizeTitleForMatch(movie.originalTitle || '');
    return normalizedTitle === targetTitle || normalizedOriginalTitle === targetTitle;
  });
};

const pickBestSearchMatch = (entry, results) => {
  if (!Array.isArray(results) || results.length === 0) return null;

  const exactTitleMatches = getExactTitleMatches(entry, results);
  if (exactTitleMatches.length === 0) return null;

  if (entry.year) {
    const exactYearMatches = exactTitleMatches.filter((movie) => Number(movie.year) === Number(entry.year));
    if (exactYearMatches.length === 1) return exactYearMatches[0];
    if (exactYearMatches.length > 1) return null;

    const nearYearMatches = exactTitleMatches.filter((movie) => {
      const movieYear = Number(movie.year);
      return Number.isFinite(movieYear) && Math.abs(movieYear - Number(entry.year)) <= 1;
    });
    if (nearYearMatches.length === 1) return nearYearMatches[0];
    if (nearYearMatches.length > 1) return null;

    if (exactTitleMatches.length === 1) return exactTitleMatches[0];

    if (exactTitleMatches.length > 0) return exactTitleMatches[0];

    return null;
  }

  if (exactTitleMatches.length === 1) {
    return exactTitleMatches[0];
  }

  return null;
};

const addMovieWithRetry = async ({ movieId, rating, watchedDate, maxAttempts = 6 }) => {
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      await movieApi.addMovie(movieId, rating, watchedDate || new Date(), null);
      return true;
    } catch (err) {
      const isRateLimited = err?.status === 429 || /rate limit/i.test(err?.message || '');
      if (!isRateLimited || attempt >= maxAttempts) {
        return false;
      }

      const retryDelayMs = Number.isFinite(err?.retryAfterMs) && err.retryAfterMs > 0
        ? err.retryAfterMs + 250
        : Math.min(30000, 2500 * attempt);

      await sleep(retryDelayMs);
    }
  }

  return false;
};

export default function AddMovies({ onMovieAdded }) {
  const isDemoMode = authUtils.isDemoMode();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [rating, setRating] = useState(0.5);
  const [hoverRating, setHoverRating] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await tmdbService.searchMovies(searchQuery);
        setSearchResults(results);
      } catch (err) {
        setError('Search failed. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleMovieSelect = async (movie) => {
    try {
      const details = await tmdbService.getMovieDetails(movie.id);
      setSelectedMovie(details || movie);
    } catch {
      setSelectedMovie(movie);
    }
  };

  const handleAddMovie = async () => {
    if (!selectedMovie || !rating) return;

    setIsAdding(true);
    setError(null);

    try {
      await movieApi.addMovie(selectedMovie.id, rating, new Date(), selectedMovie);

      if (onMovieAdded) {
        onMovieAdded();
      }

      alert(`Added ${selectedMovie.title} with rating ${rating}/5`);
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to add movie. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCsvImport = async (event) => {
    if (isDemoMode) {
      setError(DEMO_READ_ONLY_MESSAGE);
      event.target.value = '';
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const csvContent = await file.text();
      const entries = parseImportCsv(csvContent);

      if (entries.length === 0) {
        throw new Error('No valid rows found. Please use a Letterboxd or IMDb ratings export with Title and Rating columns.');
      }

      let imported = 0;
      let skipped = 0;
      let unmatched = 0;

      const TMDB_BATCH_SIZE = 10;
      const resolved = [];

      for (let i = 0; i < entries.length; i += TMDB_BATCH_SIZE) {
        const batch = entries.slice(i, i + TMDB_BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (entry) => {
            try {
              let matchedMovie = null;

              if (entry.tmdbId) {
                matchedMovie = await tmdbService.getMovieDetails(entry.tmdbId);
              }

              if (!matchedMovie && entry.imdbId) {
                matchedMovie = await tmdbService.findMovieByImdbId(entry.imdbId);
              }

              if (!matchedMovie) {
                const query = entry.year ? `${entry.title} ${entry.year}` : entry.title;
                const primaryResults = await tmdbService.searchMovies(query, { maxPages: 3 });
                matchedMovie = pickBestSearchMatch(entry, primaryResults);

                if (!matchedMovie && entry.year) {
                  const titleOnlyResults = await tmdbService.searchMovies(entry.title, { maxPages: 3 });
                  matchedMovie = pickBestSearchMatch(entry, titleOnlyResults);
                }
              }

              return { entry, matchedMovie };
            } catch {
              return { entry, matchedMovie: null };
            }
          }),
        );
        resolved.push(...batchResults);
      }

      for (const { entry, matchedMovie } of resolved) {
        if (!matchedMovie?.id) {
          skipped += 1;
          unmatched += 1;
          continue;
        }

        await sleep(300);

        const saved = await addMovieWithRetry({
          movieId: matchedMovie.id,
          rating: entry.rating,
          watchedDate: entry.watchedDate || new Date(),
          maxAttempts: 6,
        });

        if (saved) {
          imported += 1;
        } else {
          skipped += 1;
        }
      }

      if (onMovieAdded && imported > 0) {
        onMovieAdded();
      }

      const unmatchedText = unmatched > 0 ? ` (${unmatched} unmatched/ambiguous title-year pairs)` : '';
      alert(`CSV import finished. Imported ${imported} movie${imported === 1 ? '' : 's'}${skipped > 0 ? `, skipped ${skipped}${unmatchedText}` : ''}.`);
    } catch (err) {
      setError(err.message || 'CSV import failed. Please try a different export file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setSelectedMovie(null);
      setRating(0.5);
      setHoverRating(null);
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
    }, 200);
  };

  const activeRating = hoverRating ?? rating;

  return (
    <div className="flex flex-col w-full items-center justify-start mt-70">
      {!isOpen ? (
        <div className="text-center flex flex-col items-center gap-2 w-full">
          <h2 className="text-3xl font-bold mb-3">Rate a Film</h2>
          <p className="text-slate-400 mb-8 max-w-md">Add your rating to get personalized recommendations</p>

          <button
            onClick={() => setIsOpen(true)}
            className="w-50 max-w-md px-6 py-2.5 bg-blue-500 hover:bg-blue-600 rounded font-medium text-sm transition-all duration-150 shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95"
          >
            + Add a Film
          </button>

          <label className="w-full max-w-md cursor-pointer center mt-4 flex items-center justify-center">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvImport}
              disabled={isImporting}
            />
            <div className="w-50 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 rounded font-medium text-sm text-slate-50 transition-all duration-150 shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 text-center inline-flex items-center justify-center gap-2">
              {isImporting ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isImporting ? 'Importing…' : 'Import from CSV'}
            </div>
          </label>

          {error && (
            <div className="w-full max-w-md mt-3 p-3 bg-slate-900/60 border border-blue-500/40 rounded text-slate-100 text-sm">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className={`fixed inset-0 flex items-center justify-center z-50 px-4 py-8 modal-overlay ${isClosing ? 'modal-closing' : 'modal-opening'}`}>
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={handleClose} />
          <div className={`bg-slate-900 rounded-xl border border-slate-800 w-full max-w-4xl p-6 md:p-8 relative z-10 modal-content ${isClosing ? 'modal-content-closing' : 'modal-content-opening'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-50">Add a Film</h3>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-200 transition hover:scale-110 active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && <div className="mb-4 p-3 bg-slate-900/60 border border-blue-500/40 rounded text-slate-100 text-sm">{error}</div>}

            <div className="flex flex-col gap-5 max-h-[75vh] overflow-y-auto pr-1">
              {!selectedMovie ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search for a movie..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded bg-slate-800 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700 transition-all"
                      autoFocus
                    />
                    {isSearching && <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4 animate-spin" />}
                  </div>

                  <div className="space-y-1 max-h-96 overflow-y-auto overflow-x-hidden">
                    {searchResults.map((movie) => (
                      <div
                        key={movie.id}
                        onClick={() => handleMovieSelect(movie)}
                        className="flex items-center gap-3 p-2 rounded border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/50 cursor-pointer transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
                      >
                        {movie.poster ? (
                          <img src={movie.poster} alt={movie.title} className="w-12 h-16 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-16 bg-slate-700 rounded flex items-center justify-center text-slate-400 text-xs">No Image</div>
                        )}
                        <div>
                          <h4 className="font-medium text-slate-50 text-sm">{movie.title}</h4>
                          <p className="text-xs text-slate-400">{movie.year || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                    {searchQuery && !isSearching && searchResults.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">No results found</p>}
                    {!searchQuery && <p className="text-slate-400 text-center py-4 text-sm">Start typing to search for movies</p>}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
                    {selectedMovie.poster ? (
                      <img src={selectedMovie.poster} alt={selectedMovie.title} className="w-full max-w-[200px] h-[300px] object-cover rounded-lg ring-1 ring-slate-700" />
                    ) : (
                      <div className="w-full max-w-[200px] h-[300px] bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 text-xs">No Image</div>
                    )}
                    <div className="flex-1">
                      <h4 className="text-2xl font-bold text-slate-50 mb-1">{selectedMovie.title}</h4>
                      <p className="text-base text-slate-400 mb-3">
                        {selectedMovie.year || 'N/A'}
                        {selectedMovie.director && ` · ${selectedMovie.director}`}
                      </p>
                      <p className="text-sm text-slate-300 mb-3 line-clamp-4">{selectedMovie.overview || 'No overview available.'}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedMovie.genres?.map((genre, idx) => (
                          <span key={idx} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">{genre}</span>
                        ))}
                      </div>
                      <div className="text-sm text-slate-400 space-y-1 mb-4">
                        <p className="inline-flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Today: {new Date().toLocaleDateString()}</p>
                        {selectedMovie.releaseDate && <p>Release date: {new Date(selectedMovie.releaseDate).toLocaleDateString()}</p>}
                        {selectedMovie.runtime && <p>Runtime: {selectedMovie.runtime} min</p>}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedMovie(null);
                          setRating(0.5);
                          setHoverRating(null);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-200 transition hover:scale-105"
                      >
                        ← Choose a different film
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-50 mb-3 text-base">Rate this film</label>
                    <div className="flex flex-wrap items-center gap-2" onMouseLeave={() => setHoverRating(null)}>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const fillPercent = activeRating >= star ? 100 : activeRating >= star - 0.5 ? 50 : 0;

                        return (
                          <div key={star} className="relative w-11 h-11">
                            <Star className="w-11 h-11 text-slate-700" />
                            {fillPercent > 0 && (
                              <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
                                <Star className="w-11 h-11 fill-amber-400 text-amber-400" />
                              </div>
                            )}

                            <button
                              onClick={() => setRating(star - 0.5)}
                              onMouseEnter={() => setHoverRating(star - 0.5)}
                              className="absolute left-0 top-0 h-full w-1/2"
                              aria-label={`Rate ${star - 0.5} stars`}
                            />
                            <button
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              className="absolute right-0 top-0 h-full w-1/2"
                              aria-label={`Rate ${star} stars`}
                            />
                          </div>
                        );
                      })}
                      <span className="ml-4 text-slate-50 font-bold text-2xl min-w-24">{`${activeRating.toFixed(1)}/5`}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleAddMovie}
                    disabled={!rating || isAdding}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded font-medium text-base transition-all duration-150 shadow-lg shadow-blue-500/20 mt-2 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    {isAdding ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add to My Films'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalOverlayOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes modalContentIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes modalContentOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
        }
        .modal-opening {
          animation: modalOverlayIn 0.25s ease-out forwards;
        }
        .modal-closing {
          animation: modalOverlayOut 0.2s ease-in forwards;
        }
        .modal-content-opening {
          animation: modalContentIn 0.25s ease-out forwards;
        }
        .modal-content-closing {
          animation: modalContentOut 0.2s ease-in forwards;
        }
      `}</style>
    </div>
  );
}
