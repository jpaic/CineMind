import React, { useState, useEffect } from "react";
import { Star, Plus, X } from "lucide-react";
import { authUtils } from "../utils/authUtils";

export default function Profile() {
  const [isPickingShowcase, setIsPickingShowcase] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showcase, setShowcase] = useState([null, null, null, null]);
  const [hoveredMovie, setHoveredMovie] = useState(null);
  const [username, setUsername] = useState(authUtils.getUsername() || "Guest");

  useEffect(() => {
    const storedUsername = authUtils.getUsername();
    if (storedUsername) setUsername(storedUsername);
  }, []);

  const user = {
    name: username,
    bio: "Film enthusiast and Christopher Nolan superfan. Love sci-fi, thrillers, and anything that makes me think.",
    favoriteGenres: ["Sci-Fi", "Thriller", "Drama"],
    profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=1f2937&color=d4af37`,
    headerImage: "https://image.tmdb.org/t/p/original/jOzrELAzFxtMx2I4uDGHOotdfsS.jpg",
  };

  const stats = {
    filmsWatched: 247,
    thisYear: 68,
    avgRating: 7.8,
    favoriteDirector: "Christopher Nolan",
  };

  const searchResults = searchQuery.length
    ? [
        { id: 1, title: "Inception", year: 2010, poster: "https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg", director: "Christopher Nolan" },
        { id: 2, title: "Interstellar", year: 2014, poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", director: "Christopher Nolan" },
        { id: 3, title: "The Dark Knight", year: 2008, poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg", director: "Christopher Nolan" },
      ]
    : [];

  const handleAddToShowcase = (movie, index) => {
    const newShowcase = [...showcase];
    newShowcase[index] = movie;
    setShowcase(newShowcase);
    setSearchQuery("");
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = rating % 2 > 0;
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < fullStars ? "fill-amber-400 text-amber-400" : i === fullStars && hasHalfStar ? "fill-amber-400 text-amber-400" : "text-slate-700"
            }`}
          />
        ))}
      </div>
    );
  };

  const MovieCard = ({ movie }) => (
    <div className="group relative w-full h-full cursor-pointer rounded overflow-hidden">
      {movie && <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover rounded transition-transform duration-300 group-hover:scale-105" />}
      {hoveredMovie === movie?.id && movie && (
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent rounded">
          <div className="absolute inset-0 p-2 flex flex-col justify-end">
            <h3 className="font-semibold text-sm text-slate-50 mb-1 line-clamp-2">{movie.title}</h3>
            <p className="text-xs text-slate-300 mb-1">
              {movie.year} · {movie.director}
            </p>
            {movie.rating && (
              <div className="flex items-center gap-1">
                {renderStars(movie.rating)}
                <span className="text-xs text-slate-300">{movie.rating}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col w-full bg-slate-950 text-slate-50 min-h-screen">
      {/* Header */}
      <div className="w-full h-32 sm:h-40 md:h-48 overflow-hidden relative">
        <img src={user.headerImage} alt="Header" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 to-slate-950"></div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row gap-6 items-start">
        {/* Left Column */}
        <div className="flex-shrink-0 w-full md:w-1/3 flex flex-col gap-4">
          {/* Profile Info */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <img src={user.profilePicture} alt={user.name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg ring-2 ring-purple-500/30" />
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent text-center md:text-left">{user.name}</h1>
            <p className="text-slate-300 text-sm sm:text-base line-clamp-4 text-center md:text-left">{user.bio}</p>
            <div className="flex flex-wrap gap-1 justify-center md:justify-start">
              {user.favoriteGenres.map((genre) => (
                <span key={genre} className="px-2 py-0.5 text-xs sm:text-sm border border-purple-500/30 rounded text-purple-300">
                  {genre}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2 mt-2">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="border border-slate-800 rounded p-3 hover:border-purple-500/30 transition">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{key.replace(/([A-Z])/g, " $1")}</p>
                <p className={`text-xl font-bold ${key === "thisYear" ? "text-purple-400" : "text-cyan-400"}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Showcase */}
        <div className="w-full flex justify-center mt-4 md:mt-0">
          <div className="grid grid-cols-2 gap-6 sm:gap-6 md:gap-8 max-w-[500px] justify-items-center">
            {showcase.map((movie, idx) => (
              <div key={idx} className="relative group w-[160px] sm:w-[180px] md:w-[200px] aspect-[2/3] flex-shrink-0">
                {movie ? (
                  <MovieCard movie={movie} />
                ) : (
                  <button
                    onClick={() => setIsPickingShowcase(idx)}
                    className="w-full h-full rounded border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-slate-900/30 hover:bg-slate-900/50 flex items-center justify-center text-purple-400/70 text-4xl sm:text-5xl transition"
                  >
                    <Plus className="w-12 h-12 sm:w-16 sm:h-16" />
                  </button>
                )}
                {movie && (
                  <button
                    onClick={() => {
                      const newShowcase = [...showcase];
                      newShowcase[idx] = null;
                      setShowcase(newShowcase);
                    }}
                    className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-5 h-5 text-slate-300" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
