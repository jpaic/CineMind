import React, { useState, useEffect } from 'react';
import { X, Search, Star, Loader, CalendarDays, Upload } from 'lucide-react';
import { tmdbService } from '../api/tmdb';
import { movieApi } from '../api/movieApi';

const STAR_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const normalizeHeader = (value = '') => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseCsvRow = (row) => {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    const nextChar = row[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const toTenPointRating = (value) => {
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
    return Number.isFinite(asTenPoint) ? Math.min(10, Math.max(0, Math.round(asTenPoint))) : null;
  }

  const fractionMatch = raw.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }
    return Math.min(10, Math.max(0, Math.round((numerator / denominator) * 10)));
  }

  const normalized = raw.replace(/★/g, '');
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (numeric <= 5) {
    return Math.round(numeric * 2);
  }

  return Math.min(10, Math.max(0, Math.round(numeric)));
};

const parseImportCsv = (csvText) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headerValues = parseCsvRow(lines[0]).map(normalizeHeader);

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
  const watchedDateIndex = findHeaderIndex('Watched Date', 'Date', 'Date Rated');

  if (titleIndex < 0 || ratingIndex < 0) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvRow(line);
    return {
      title: values[titleIndex]?.replace(/^"|"$/g, '').trim(),
      year: values[yearIndex] ? Number(values[yearIndex]) || null : null,
      rating: toTenPointRating(values[ratingIndex]),
      watchedDate: values[watchedDateIndex] || null,
    };
  }).filter((entry) => entry.title && entry.rating && entry.rating > 0);
};

export default function AddMovies({ onMovieAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
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
    if (!selectedMovie || rating === 0) return;

    setIsAdding(true);
    setError(null);

    try {
      await movieApi.addMovie(selectedMovie.id, rating, new Date(), selectedMovie);

      if (onMovieAdded) {
        onMovieAdded();
      }

      alert(`Added ${selectedMovie.title} with rating ${rating}/10`);
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to add movie. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCsvImport = async (event) => {
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

      for (const entry of entries) {
        try {
          const query = entry.year ? `${entry.title} ${entry.year}` : entry.title;
          const results = await tmdbService.searchMovies(query);
          const bestMatch = entry.year
            ? results.find((movie) => Number(movie.year) === Number(entry.year)) || results[0]
            : results[0];

          if (!bestMatch?.id) {
            skipped += 1;
            continue;
          }

          const details = await tmdbService.getMovieDetails(bestMatch.id);
          await movieApi.addMovie(bestMatch.id, entry.rating, entry.watchedDate || new Date(), details || bestMatch);
          imported += 1;
        } catch {
          skipped += 1;
        }
      }

      if (onMovieAdded && imported > 0) {
        onMovieAdded();
      }

      alert(`CSV import finished. Imported ${imported} movie${imported === 1 ? '' : 's'}${skipped > 0 ? `, skipped ${skipped}` : ''}.`);
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
      setRating(0);
      setHoverRating(0);
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
    }, 200);
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="flex flex-col w-full items-center justify-start mt-70">
      {!isOpen ? (
        <div className="text-center flex flex-col items-center gap-2 w-full">
          <h2 className="text-3xl font-bold mb-3">Rate a Film</h2>
          <p className="text-slate-400 mb-8 max-w-md">Add your rating to get personalized recommendations</p>

          <button
            onClick={() => setIsOpen(true)}
            className="w-50 max-w-md px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 rounded font-medium text-sm transition-all duration-150 shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95"
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
            <div className="w-50 px-6 py-2.5 bg-gradient-to-r from-green-500 to-lime-400 hover:from-green-400 hover:to-lime-300 rounded font-medium text-sm text-slate-50 transition-all duration-150 shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 text-center inline-flex items-center justify-center gap-2">
              {isImporting ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isImporting ? 'Importing…' : 'Import from CSV'}
            </div>
          </label>
        </div>
      ) : (
        <div className={`fixed inset-0 flex items-center justify-center z-50 px-4 py-8 modal-overlay ${isClosing ? 'modal-closing' : 'modal-opening'}`}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
          <div className={`bg-slate-900 rounded-xl border border-slate-800 w-full max-w-4xl p-6 md:p-8 relative z-10 modal-content ${isClosing ? 'modal-content-closing' : 'modal-content-opening'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-50">Add a Film</h3>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-200 transition hover:scale-110 active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">{error}</div>}

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
                      className="w-full pl-10 pr-4 py-3 rounded bg-slate-800 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-slate-700 transition-all"
                      autoFocus
                    />
                    {isSearching && <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4 animate-spin" />}
                  </div>

                  <div className="space-y-1 max-h-96 overflow-y-auto overflow-x-hidden">
                    {searchResults.map((movie) => (
                      <div
                        key={movie.id}
                        onClick={() => handleMovieSelect(movie)}
                        className="flex items-center gap-3 p-2 rounded border border-slate-800 hover:border-purple-400/50 hover:bg-slate-800/50 cursor-pointer transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
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
                          setRating(0);
                          setHoverRating(0);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-200 transition hover:scale-105"
                      >
                        ← Choose a different film
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-50 mb-3 text-base">Rate this film</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {STAR_VALUES.map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-125 active:scale-95"
                        >
                          <Star className={`w-8 h-8 ${star <= activeRating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                        </button>
                      ))}
                      <span className="ml-3 text-slate-50 font-bold text-lg min-w-20">{activeRating > 0 ? `${activeRating}/10` : '0/10'}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleAddMovie}
                    disabled={rating === 0 || isAdding}
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded font-medium text-base transition-all duration-150 shadow-lg shadow-purple-500/20 mt-2 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
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
