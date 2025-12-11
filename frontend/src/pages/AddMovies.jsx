import React, { useState } from 'react';
import { X, Search, Star } from 'lucide-react';
import Papa from 'papaparse';

export default function AddMovies() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [importedMovies, setImportedMovies] = useState([]);

  // Static movies
  const staticMovies = [
    { 
      id: 1, 
      title: 'Inception', 
      year: 2010,
      poster: 'https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg',
      director: 'Christopher Nolan'
    },
    { 
      id: 2, 
      title: 'Interstellar', 
      year: 2014,
      poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      director: 'Christopher Nolan'
    },
  ];

  // Merge static + imported movies
  const allMovies = [...staticMovies, ...importedMovies];

  const filteredMovies = searchQuery
    ? allMovies.filter(movie =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleAddMovie = () => {
    if (selectedMovie && rating > 0) {
      alert(`Added ${selectedMovie.title} with rating ${rating}/10`);
      setIsOpen(false);
      setSelectedMovie(null);
      setRating(0);
      setSearchQuery('');
    }
  };

  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const movies = results.data.map((row, index) => ({
          id: Date.now() + index,
          title: row.title,
          year: row.year,
          director: row.director || '',
          poster: row.poster || '',
        }));

        setImportedMovies((prev) => [...prev, ...movies]);
        alert(`${movies.length} movies imported!`);
      },
    });
  };

  return (
    <div className="flex flex-col w-full bg-slate-950 text-slate-50 min-h-screen items-center justify-start px-6">
      {!isOpen ? (
        <div className="text-center mt-70">
          <h2 className="text-3xl font-bold mb-3">Rate a Film</h2>
          <p className="text-slate-400 mb-8 max-w-md">
            Add your rating to get personalized recommendations
          </p>
          
          <div className="flex flex-col gap-4 items-center">
            <button
              onClick={() => setIsOpen(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 rounded font-medium text-sm transition shadow-lg shadow-purple-500/20"
            >
              + Add a Film
            </button>

            <label className="inline-block px-6 py-2.5 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-400 hover:to-teal-400 rounded font-medium text-sm cursor-pointer text-slate-50">
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 px-4 pt-16">
          <div className="bg-slate-900 rounded-lg border border-slate-800 w-full max-w-2xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-50">Add a Film</h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSelectedMovie(null);
                  setRating(0);
                  setSearchQuery('');
                }}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-4">
              {!selectedMovie ? (
                <>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search for a movie..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded bg-slate-800 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-slate-700"
                      autoFocus
                    />
                  </div>

                  {/* Search Results */}
                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {filteredMovies.map((movie) => (
                      <div
                        key={movie.id}
                        onClick={() => setSelectedMovie(movie)}
                        className="flex items-center gap-3 p-2 rounded border border-slate-800 hover:border-purple-400/50 hover:bg-slate-800/50 cursor-pointer transition"
                      >
                        {movie.poster ? (
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-10 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-slate-700 rounded flex items-center justify-center text-slate-400 text-xs">
                            No Image
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium text-slate-50 text-sm">{movie.title}</h4>
                          <p className="text-xs text-slate-400">{movie.year} · {movie.director}</p>
                        </div>
                      </div>
                    ))}
                    {searchQuery && filteredMovies.length === 0 && (
                      <p className="text-slate-400 text-center py-4 text-sm">No results found</p>
                    )}
                    {!searchQuery && (
                      <p className="text-slate-400 text-center py-4 text-sm">Start typing to search for movies</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Selected Movie */}
                  <div className="flex gap-4">
                    {selectedMovie.poster ? (
                      <img
                        src={selectedMovie.poster}
                        alt={selectedMovie.title}
                        className="w-20 h-28 object-cover rounded ring-1 ring-slate-700"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-slate-700 rounded flex items-center justify-center text-slate-400 text-xs">
                        No Image
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-50 mb-1">{selectedMovie.title}</h4>
                      <p className="text-sm text-slate-400 mb-2">{selectedMovie.year} · {selectedMovie.director}</p>
                      
                      <button
                        onClick={() => {
                          setSelectedMovie(null);
                          setRating(0);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-200 transition"
                      >
                        ← Choose a different film
                      </button>
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="block font-medium text-slate-50 mb-2 text-sm">Rate this film</label>
                    <div className="flex items-center gap-1.5">
                      {[1,2,3,4,5,6,7,8,9,10].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= (hoverRating || rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        </button>
                      ))}
                      {rating > 0 && (
                        <span className="ml-2 text-slate-50 font-bold text-sm">{rating}/10</span>
                      )}
                    </div>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={handleAddMovie}
                    disabled={rating === 0}
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded font-medium text-sm transition shadow-lg shadow-purple-500/20 mt-2"
                  >
                    Add to My Films
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
