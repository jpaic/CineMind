import React, { useState, useEffect, useCallback } from "react";
import { Plus, X, Search, Pencil } from "lucide-react";
import { authUtils } from "../utils/authUtils";
import { movieApi } from "../api/movieApi";
import { tmdbService } from "../api/tmdb";
import Card from "../components/Card";
import FilmReelLoading from "../components/FilmReelLoading";

const DEFAULT_PROFILE_STATS = {
  filmsWatched: 0,
  thisYear: 0,
  avgRating: 0,
  favoriteDirector: null,
  favoriteDirectorMoviesWatched: 0,
  favoriteDirectorAvgRating: 0,
};

const DEFAULT_HEADER_IMAGE = "https://image.tmdb.org/t/p/original/jOzrELAzFxtMx2I4uDGHOotdfsS.jpg";
const MAX_BIO_LENGTH = 100;
const DEFAULT_BANNER_SETTINGS = {
  positionX: 50,
  positionY: 50,
  scale: 100,
};
const BIO_SIZING_TEXT = "W".repeat(MAX_BIO_LENGTH);

const getProfilePreferencesStorageKey = (username) => `profilePreferencesV1:${(username || "Guest").toLowerCase()}`;

export default function Profile() {
  const [isPickingShowcase, setIsPickingShowcase] = useState(false);
  const [currentShowcaseIndex, setCurrentShowcaseIndex] = useState(null);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showcase, setShowcase] = useState([null, null, null, null]);
  const [userLibrary, setUserLibrary] = useState([]);
  const [profileStats, setProfileStats] = useState(DEFAULT_PROFILE_STATS);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(authUtils.getUsername() || "Guest");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [headerImage, setHeaderImage] = useState(DEFAULT_HEADER_IMAGE);
  const [bannerSettings, setBannerSettings] = useState(DEFAULT_BANNER_SETTINGS);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isPickingBannerMovie, setIsPickingBannerMovie] = useState(false);
  const [bannerQuery, setBannerQuery] = useState("");
  const [bannerSearchResults, setBannerSearchResults] = useState([]);
  const [bannerSearchLoading, setBannerSearchLoading] = useState(false);
  const [editFormBio, setEditFormBio] = useState("");
  const [editFormProfilePicture, setEditFormProfilePicture] = useState("");
  const [editFormHeaderImage, setEditFormHeaderImage] = useState(DEFAULT_HEADER_IMAGE);
  const [editFormBannerSettings, setEditFormBannerSettings] = useState(DEFAULT_BANNER_SETTINGS);
  const [bannerOptions, setBannerOptions] = useState([]);
  const [isPickingBannerOptions, setIsPickingBannerOptions] = useState(false);
  const [selectedBannerMovieTitle, setSelectedBannerMovieTitle] = useState("");
  const [bannerOptionsLoading, setBannerOptionsLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(authUtils.isDemoMode());

  const deriveFavoriteDirectorFromMovies = useCallback((movies) => {
    const qualifiedDirectors = movies.reduce((acc, movie) => {
      const directorName = (movie.director || "").trim();
      const rating = Number(movie.rating);

      if (!directorName || !Number.isFinite(rating)) {
        return acc;
      }

      if (!acc.has(directorName)) {
        acc.set(directorName, {
          director: directorName,
          moviesWatched: 0,
          totalRating: 0,
        });
      }

      const current = acc.get(directorName);
      current.moviesWatched += 1;
      current.totalRating += rating;

      return acc;
    }, new Map());

    const ranked = Array.from(qualifiedDirectors.values())
      .map((item) => {
        const avgDirectorRating = Number((item.totalRating / item.moviesWatched).toFixed(2));
        const weightedScore = avgDirectorRating * 100 + item.moviesWatched;

        return {
          director: item.director,
          moviesWatched: item.moviesWatched,
          avgDirectorRating,
          weightedScore,
        };
      })
      .filter((item) => item.moviesWatched >= 2)
      .sort((a, b) => (
        b.weightedScore - a.weightedScore
        || b.avgDirectorRating - a.avgDirectorRating
        || b.moviesWatched - a.moviesWatched
        || a.director.localeCompare(b.director)
      ));

    const topDirector = ranked[0];
    if (!topDirector) {
      return {
        favoriteDirector: null,
        favoriteDirectorMoviesWatched: 0,
        favoriteDirectorAvgRating: 0,
      };
    }

    return {
      favoriteDirector: topDirector.director,
      favoriteDirectorMoviesWatched: topDirector.moviesWatched,
      favoriteDirectorAvgRating: topDirector.avgDirectorRating,
    };
  }, []);

  const deriveStatsFromMovies = useCallback((movies) => {
    const derivedFavoriteDirector = deriveFavoriteDirectorFromMovies(movies);

    return {
      filmsWatched: movies.length,
      thisYear: movies.filter((movie) => {
        const watchedYear = movie.watchedDate ? new Date(movie.watchedDate).getFullYear() : null;
        return watchedYear === new Date().getFullYear();
      }).length,
      avgRating: movies.length > 0
        ? Number((movies.reduce((sum, movie) => sum + movie.rating, 0) / movies.length).toFixed(1))
        : 0,
      ...derivedFavoriteDirector,
    };
  }, [deriveFavoriteDirectorFromMovies]);

  const applyBootstrapData = useCallback((bootstrapData) => {
    const userMovies = bootstrapData.movies || [];
    const showcaseItems = (bootstrapData.showcase || []).map((item) => ({
      ...item,
      position: item.position - 1,
    }));

    if (userMovies.length === 0) {
      setUserLibrary([]);
      setShowcase([null, null, null, null]);
      return [];
    }

    const seenMovieIds = new Set();
    const enrichedMovies = userMovies.reduce((movies, movie) => {
      if (seenMovieIds.has(movie.movie_id)) {
        return movies;
      }
      seenMovieIds.add(movie.movie_id);

      let parsedGenres = [];
      if (movie.genres) {
        if (typeof movie.genres === "string") {
          try {
            parsedGenres = JSON.parse(movie.genres);
          } catch {
            parsedGenres = [];
          }
        } else {
          parsedGenres = movie.genres;
        }
      }

      movies.push({
        id: movie.movie_id,
        title: movie.title || "Loading...",
        rating: movie.rating,
        year: movie.year || null,
        poster: movie.poster_path || null,
        director: movie.director || null,
        directorId: movie.director_id || null,
        genres: parsedGenres,
        watchedDate: movie.watched_date,
        updatedAt: movie.updated_at,
      });

      return movies;
    }, []);

    setUserLibrary(enrichedMovies);

    const movieById = new Map(enrichedMovies.map((movie) => [movie.id, movie]));
    const newShowcase = [null, null, null, null];
    for (const item of showcaseItems) {
      if (item.position >= 0 && item.position <= 3) {
        const showcaseMovie = movieById.get(item.movie_id);
        if (showcaseMovie) {
          newShowcase[item.position] = showcaseMovie;
        }
      }
    }
    setShowcase(newShowcase);

    return enrichedMovies;
  }, []);

  const hydrateMissingMovieDetails = useCallback((movies) => {
    const uncachedIds = movies
      .filter((movie) => movie.title === "Loading...")
      .map((movie) => movie.id);

    if (uncachedIds.length === 0) {
      return;
    }

    tmdbService.getMoviesDetails(uncachedIds).then((tmdbDetails) => {
      const tmdbById = new Map(tmdbDetails.map((movie) => [movie.id, movie]));

      setUserLibrary((prevMovies) => prevMovies.map((movie) => {
        const tmdb = tmdbById.get(movie.id);
        if (!tmdb) return movie;

        return {
          ...movie,
          title: movie.title === "Loading..." ? (tmdb.title || movie.title) : movie.title,
          year: movie.year || tmdb.year || null,
          poster: movie.poster || tmdb.poster || null,
          director: movie.director || tmdb.director || null,
          directorId: movie.directorId || tmdb.directorId || null,
          genres: movie.genres?.length ? movie.genres : (tmdb.genres || []),
        };
      }));

      const cachePromises = tmdbDetails.map((movie) =>
        movieApi.cacheMovie(movie).catch(() => {})
      );
      Promise.all(cachePromises).catch(() => {});
    }).catch(() => {});
  }, []);

  const loadShowcaseAndLibrary = useCallback(async ({ forceRefresh = false, showLoading = true } = {}) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const bootstrapData = await movieApi.getProfileBootstrap({ forceRefresh });
      const enrichedMovies = applyBootstrapData(bootstrapData);
      hydrateMissingMovieDetails(enrichedMovies);

      const statsData = await movieApi.getProfileStats().catch(() => null);
      if (statsData?.success && statsData?.stats) {
        setProfileStats(statsData.stats);
      } else {
        setProfileStats(deriveStatsFromMovies(enrichedMovies));
      }
    } catch {
      setUserLibrary([]);
      setShowcase([null, null, null, null]);
      setProfileStats(DEFAULT_PROFILE_STATS);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [applyBootstrapData, deriveStatsFromMovies, hydrateMissingMovieDetails]);

  // Load username on mount
  useEffect(() => {
    const storedUsername = authUtils.getUsername();
    if (storedUsername) setUsername(storedUsername);
    setIsDemoMode(authUtils.isDemoMode());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = getProfilePreferencesStorageKey(username);
    try {
      const rawPreferences = localStorage.getItem(storageKey);
      if (!rawPreferences) {
        setBio("");
        setProfilePicture("");
        setHeaderImage(DEFAULT_HEADER_IMAGE);
        setBannerSettings(DEFAULT_BANNER_SETTINGS);
        return;
      }

      const parsed = JSON.parse(rawPreferences);
      setBio(typeof parsed.bio === "string" ? parsed.bio : "");
      setProfilePicture(typeof parsed.profilePicture === "string" ? parsed.profilePicture : "");
      setHeaderImage(typeof parsed.headerImage === "string" && parsed.headerImage ? parsed.headerImage : DEFAULT_HEADER_IMAGE);
      setBannerSettings({
        positionX: DEFAULT_BANNER_SETTINGS.positionX,
        positionY: Number.isFinite(parsed?.bannerSettings?.positionY) ? parsed.bannerSettings.positionY : DEFAULT_BANNER_SETTINGS.positionY,
        scale: DEFAULT_BANNER_SETTINGS.scale,
      });
    } catch {
      setBio("");
      setProfilePicture("");
      setHeaderImage(DEFAULT_HEADER_IMAGE);
      setBannerSettings(DEFAULT_BANNER_SETTINGS);
    }
  }, [username]);

  const persistProfilePreferences = useCallback((nextPreferences) => {
    if (typeof window === "undefined") return;
    const storageKey = getProfilePreferencesStorageKey(username);
    localStorage.setItem(storageKey, JSON.stringify(nextPreferences));
  }, [username]);

  // Load showcase and library on mount
  useEffect(() => {
    const cachedBootstrap = movieApi.getCachedProfileBootstrapSnapshot();
    if (cachedBootstrap?.success) {
      const cachedMovies = applyBootstrapData(cachedBootstrap);
      setProfileStats(deriveStatsFromMovies(cachedMovies));
      setLoading(false);
      loadShowcaseAndLibrary({ forceRefresh: true, showLoading: false });
      return;
    }

    loadShowcaseAndLibrary();
  }, [applyBootstrapData, deriveStatsFromMovies, loadShowcaseAndLibrary]);

  const user = {
    name: username,
    bio,
    favoriteGenres: ["Sci-Fi", "Thriller", "Drama"],
    profilePicture: profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=1f2833&color=f1e9da`,
    headerImage,
    bannerSettings,
  };

  const stats = {
    filmsWatched: profileStats.filmsWatched,
    thisYear: profileStats.thisYear,
    avgRating: profileStats.avgRating,
    favoriteDirector: profileStats.favoriteDirector || "N/A",
  };

  const showcaseMovieIds = showcase.filter(m => m !== null).map(m => m.id);
  const availableMovies = userLibrary.filter(movie => !showcaseMovieIds.includes(movie.id));

  const searchResults = searchQuery.length
    ? availableMovies.filter(movie => 
        movie.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleOpenModal = (index) => {
    setCurrentShowcaseIndex(index);
    setIsPickingShowcase(true);
    setSearchQuery("");
  };

  const handleCloseModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setIsPickingShowcase(false);
      setIsModalClosing(false);
      setCurrentShowcaseIndex(null);
      setSearchQuery("");
    }, 200);
  };

  const handleAddToShowcase = async (movie) => {
    try {
      if (!userLibrary.find(m => m.id === movie.id)) {
        alert('This movie is not in your library. Please rate it first.');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      await movieApi.setShowcasePosition(currentShowcaseIndex, movie.id);
      
      const newShowcase = [...showcase];
      newShowcase[currentShowcaseIndex] = movie;
      setShowcase(newShowcase);
      
      handleCloseModal();
    } catch (err) {
      const errorMsg = err.message || 'Failed to update showcase. Please try again.';
      alert(errorMsg);
    }
  };

  const handleRemoveFromShowcase = async (index) => {
    try {
      await movieApi.removeShowcasePosition(index);
      const newShowcase = [...showcase];
      newShowcase[index] = null;
      setShowcase(newShowcase);
    } catch {
      alert('Failed to update showcase. Please try again.');
    }
  };

  const handleOpenProfileEditor = () => {
    if (isDemoMode) return;
    setEditFormBio(bio);
    setEditFormProfilePicture(profilePicture);
    setEditFormHeaderImage(headerImage);
    setEditFormBannerSettings(bannerSettings || DEFAULT_BANNER_SETTINGS);
    setBannerOptions([]);
    setSelectedBannerMovieTitle("");
    setBannerQuery("");
    setBannerSearchResults([]);
    setIsPickingBannerMovie(false);
    setIsPickingBannerOptions(false);
    setIsEditingProfile(true);
  };

  const handleCloseProfileEditor = () => {
    setIsPickingBannerMovie(false);
    setBannerQuery("");
    setBannerSearchResults([]);
    setBannerOptions([]);
    setSelectedBannerMovieTitle("");
    setBannerOptionsLoading(false);
    setIsPickingBannerOptions(false);
    setIsEditingProfile(false);
  };

  const handleProfilePictureUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setEditFormProfilePicture(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfilePreferences = () => {
    const trimmedBio = editFormBio.trim().slice(0, MAX_BIO_LENGTH);
    const clampedBannerSettings = {
      positionX: DEFAULT_BANNER_SETTINGS.positionX,
      positionY: Math.min(100, Math.max(0, editFormBannerSettings.positionY)),
      scale: DEFAULT_BANNER_SETTINGS.scale,
    };

    const nextPreferences = {
      bio: trimmedBio,
      profilePicture: editFormProfilePicture || "",
      headerImage: editFormHeaderImage || DEFAULT_HEADER_IMAGE,
      bannerSettings: clampedBannerSettings,
    };

    setBio(nextPreferences.bio);
    setProfilePicture(nextPreferences.profilePicture);
    setHeaderImage(nextPreferences.headerImage);
    setBannerSettings(clampedBannerSettings);
    persistProfilePreferences(nextPreferences);
    handleCloseProfileEditor();
  };

  const handleBannerSearch = async (query) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setBannerSearchResults([]);
      return;
    }

    setBannerSearchLoading(true);
    const results = await tmdbService.searchMovies(trimmedQuery);
    setBannerSearchResults(Array.isArray(results) ? results.slice(0, 20) : []);
    setBannerSearchLoading(false);
  };

  useEffect(() => {
    if (!isEditingProfile || !isPickingBannerMovie) return;

    const timer = setTimeout(() => {
      handleBannerSearch(bannerQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [bannerQuery, isEditingProfile, isPickingBannerMovie]);

  const handleSelectBannerMovie = async (movie) => {
    setSelectedBannerMovieTitle(movie.title || "Selected movie");
    setIsPickingBannerOptions(true);
    setBannerOptionsLoading(true);

    try {
      const detailedMovie = await tmdbService.getMovieDetails(movie.id);
      const backdropOptions = await tmdbService.getMovieBackdropOptions(movie.id);

      const fallbackImages = [
        ...backdropOptions,
        detailedMovie?.backdrop,
        detailedMovie?.poster,
        movie.backdrop,
        movie.poster,
      ].filter(Boolean);

      const uniqueOptions = Array.from(new Set(fallbackImages));
      const nextOptions = uniqueOptions.length ? uniqueOptions : [DEFAULT_HEADER_IMAGE];

      setBannerOptions(nextOptions);
      setEditFormHeaderImage(nextOptions[0]);
    } finally {
      setBannerOptionsLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <FilmReelLoading isVisible={true} message="Loading your profile..." blocking={false} />

        {/* Header */}
        <div className="w-full h-32 sm:h-40 md:h-48 overflow-hidden relative">
          <div className="w-full h-full bg-slate-900" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 to-slate-950" />
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row gap-6 items-start">

          {/* Left column */}
          <div className="flex-shrink-0 w-full md:w-1/3 flex flex-col gap-4">
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-slate-800 ring-2 ring-slate-700" />
              <div className="h-8 sm:h-9 w-40 rounded bg-slate-800" />
              <div className="w-full space-y-2">
                <div className="h-3.5 w-full rounded bg-slate-800" />
                <div className="h-3.5 w-5/6 rounded bg-slate-800" />
                <div className="h-3.5 w-4/5 rounded bg-slate-800" />
                <div className="h-3.5 w-3/5 rounded bg-slate-800" />
              </div>
              <div className="flex flex-wrap gap-1 justify-center md:justify-start">
                <div className="h-6 w-14 rounded bg-slate-800 border border-slate-700" />
                <div className="h-6 w-16 rounded bg-slate-800 border border-slate-700" />
                <div className="h-6 w-12 rounded bg-slate-800 border border-slate-700" />
              </div>
            </div>

            <div className="space-y-2 mt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border border-slate-800 rounded p-3">
                  <div className="h-2.5 w-24 rounded bg-slate-800 mb-1" />
                  <div className="h-7 w-12 rounded bg-slate-800" />
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="w-full flex justify-center mt-4 md:mt-0">
            <div className="grid grid-cols-2 gap-6 sm:gap-6 md:gap-8 max-w-[500px] justify-items-center">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="relative w-[160px] sm:w-[180px] md:w-[200px] aspect-[2/3] flex-shrink-0 rounded bg-slate-800 ring-1 ring-slate-700"
                />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="relative flex flex-col w-full bg-slate-950 text-slate-50 min-h-screen overflow-hidden">
      {/* Header */}
      <div className="w-full h-32 sm:h-40 md:h-48 overflow-hidden relative z-10">
        <img
          src={user.headerImage}
          alt="Header"
          className="w-full h-full object-cover opacity-45"
          style={{
            objectPosition: `${user.bannerSettings.positionX}% ${user.bannerSettings.positionY}%`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 to-slate-950"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row gap-6 items-start">
        {/* Left Column */}
        <div className="flex-shrink-0 w-full md:w-1/3 flex flex-col gap-4">
          {/* Profile Info */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-start gap-3">
              <img src={user.profilePicture} alt={user.name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg ring-2 ring-blue-500/30" />
              <button
                onClick={handleOpenProfileEditor}
                disabled={isDemoMode}
                title={isDemoMode ? "Disabled in demo mode" : "Edit profile"}
                className="mt-1 p-2 rounded-md border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Pencil className="w-4 h-4 text-slate-300" />
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 text-center md:text-left">{user.name}</h1>
            <div className="relative w-full">
              <p className="invisible text-slate-300 text-sm sm:text-base break-words text-center md:text-left">{BIO_SIZING_TEXT}</p>
              <p className="absolute inset-0 text-slate-300 text-sm sm:text-base break-words text-center md:text-left">
                {(user.bio || "No description yet.").slice(0, MAX_BIO_LENGTH)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1 justify-center md:justify-start">
              {user.favoriteGenres.map((genre) => (
                <span key={genre} className="px-2 py-0.5 text-xs sm:text-sm border border-blue-500/30 rounded text-slate-200">
                  {genre}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2 mt-2">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="border border-slate-800 rounded p-3 hover:border-blue-500/30 transition">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{key.replace(/([A-Z])/g, " $1")}</p>
                <p className={`text-xl font-bold ${key === "thisYear" ? "text-blue-500" : "text-blue-500"}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Showcase */}
        <div className="w-full flex justify-center mt-4 md:mt-0">
          {userLibrary.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg mb-2">No films rated yet</p>
              <p className="text-slate-500 text-sm">Rate some films to create your showcase</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:gap-6 md:gap-8 max-w-[500px] justify-items-center">
              {showcase.map((movie, idx) => (
                <div key={idx} className="relative group w-[160px] sm:w-[180px] md:w-[200px] aspect-[2/3] flex-shrink-0">
                  {movie ? (
                    <>
                      <Card movie={movie} showRating={true} index={idx} hideWatchlist={true} />
                      <button
                        onClick={() => handleRemoveFromShowcase(idx)}
                        className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition hover:scale-110 active:scale-90 z-10"
                      >
                        <X className="w-5 h-5 text-slate-300" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleOpenModal(idx)}
                      className="w-full h-full rounded border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 bg-slate-900/30 hover:bg-slate-900/50 flex items-center justify-center text-blue-500/70 text-4xl sm:text-5xl transition-all hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-12 h-12 sm:w-16 sm:h-16" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isEditingProfile && (
        <div className="fixed inset-0 flex items-start justify-center z-50 px-4 pt-16 modal-overlay modal-opening">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={handleCloseProfileEditor} />
          <div className="bg-slate-900 rounded-lg border border-slate-800 w-full max-w-2xl p-4 relative z-10 modal-content modal-content-opening">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-50">Edit Profile</h3>
              <button onClick={handleCloseProfileEditor} className="text-slate-400 hover:text-slate-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Description</label>
                <textarea
                  value={editFormBio}
                  onChange={(event) => setEditFormBio(event.target.value.slice(0, MAX_BIO_LENGTH))}
                  rows={4}
                  placeholder="Tell people about your movie taste..."
                  className="w-full rounded bg-slate-800 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700 p-3"
                  maxLength={MAX_BIO_LENGTH}
                />
                <p className="mt-1 text-xs text-slate-400 text-right">{editFormBio.length}/{MAX_BIO_LENGTH}</p>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Profile Picture Upload</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="w-full text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-blue-500/20 file:px-3 file:py-1.5 file:text-blue-300 hover:file:bg-blue-500/30"
                />
              </div>

              <div>
                <button
                  onClick={() => setIsPickingBannerMovie((prev) => !prev)}
                  className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm hover:border-blue-500/50"
                >
                  {isPickingBannerMovie ? "Hide Banner Picker" : "Choose Banner from Movie"}
                </button>

                {isPickingBannerMovie && (
                  <div className="mt-3 rounded border border-slate-800 p-3 bg-slate-950/50">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="text"
                        value={bannerQuery}
                        onChange={(event) => setBannerQuery(event.target.value)}
                        placeholder="Search movie for banner..."
                        className="w-full pl-10 pr-4 py-2.5 rounded bg-slate-800 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700"
                      />
                    </div>
                    {bannerSearchLoading && <p className="text-sm text-slate-400">Searching...</p>}
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {bannerSearchResults.map((movie) => (
                        <button
                          key={movie.id}
                          type="button"
                          onClick={() => handleSelectBannerMovie(movie)}
                          className="w-full text-left flex items-center gap-3 p-2 rounded border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/50"
                        >
                          {movie.poster ? (
                            <img src={movie.poster} alt={movie.title} className="w-10 h-14 object-cover rounded flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-14 bg-slate-700 rounded flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm text-slate-100 truncate">{movie.title}</p>
                            <p className="text-xs text-slate-400">{movie.year || "N/A"}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 rounded border border-slate-800 p-3 space-y-3">
                      <p className="text-sm text-slate-200">Banner position and framing</p>
                      <label className="block text-xs text-slate-400">
                        Vertical ({Math.round(editFormBannerSettings.positionY)}%)
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={editFormBannerSettings.positionY}
                          onChange={(event) => setEditFormBannerSettings((prev) => ({ ...prev, positionY: Number(event.target.value) }))}
                          className="w-full"
                        />
                      </label>
                      <div className="rounded overflow-hidden border border-slate-700">
                        <img
                          src={editFormHeaderImage || DEFAULT_HEADER_IMAGE}
                          alt="Banner preview"
                          className="w-full h-20 object-cover"
                          style={{
                            objectPosition: `${editFormBannerSettings.positionX}% ${editFormBannerSettings.positionY}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={handleCloseProfileEditor} className="px-3 py-2 rounded border border-slate-700 text-slate-300">
                  Cancel
                </button>
                <button onClick={handleSaveProfilePreferences} className="px-3 py-2 rounded bg-blue-600 text-white">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditingProfile && isPickingBannerOptions && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] px-4 py-8 modal-overlay modal-opening">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsPickingBannerOptions(false)}
          />
          <div className="bg-slate-900 rounded-lg border border-slate-800 w-full max-w-4xl p-4 relative z-10 modal-content modal-content-opening max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-50">Choose Banner Image</h3>
              <button
                onClick={() => setIsPickingBannerOptions(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Example banners from <span className="text-slate-200">{selectedBannerMovieTitle}</span>.
            </p>

            {bannerOptionsLoading ? (
              <p className="text-sm text-slate-400">Loading banner options...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {bannerOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setEditFormHeaderImage(option);
                      setIsPickingBannerOptions(false);
                    }}
                    className={`rounded overflow-hidden border transition ${
                      editFormHeaderImage === option
                        ? "border-blue-500 ring-2 ring-blue-500/40"
                        : "border-slate-700 hover:border-blue-500/50"
                    }`}
                  >
                    <img src={option} alt="Banner option" className="w-full h-36 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Showcase Picker Modal */}
      {isPickingShowcase && (
        <div className={`fixed inset-0 flex items-start justify-center z-50 px-4 pt-16 modal-overlay ${isModalClosing ? 'modal-closing' : 'modal-opening'}`}>
          <div 
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className={`bg-slate-900 rounded-lg border border-slate-800 w-full max-w-2xl p-4 relative z-10 modal-content ${isModalClosing ? 'modal-content-closing' : 'modal-content-opening'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-50">Choose a Film for Showcase</h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-200 transition hover:scale-110 active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search your rated films..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded bg-slate-800 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700 transition-all"
                autoFocus
              />
            </div>

            <div className="space-y-1 max-h-96 overflow-y-auto overflow-x-hidden">
              {searchResults.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => handleAddToShowcase(movie)}
                  className="flex items-center gap-3 p-2 rounded border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/50 cursor-pointer transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-10 h-14 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-slate-700 rounded flex items-center justify-center text-slate-400 text-xs flex-shrink-0">
                      No Image
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-50 text-sm truncate">{movie.title}</h4>
                    <p className="text-xs text-slate-400">{movie.year} · {movie.director}</p>
                    {movie.genres && movie.genres.length > 0 && (
                      <p className="text-xs text-slate-500">{movie.genres.slice(0, 2).join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <p className="text-slate-400 text-center py-4 text-sm">
                  {availableMovies.length === 0 ? "All your rated films are already in your showcase" : "No results found"}
                </p>
              )}
              {!searchQuery && (
                <p className="text-slate-400 text-center py-4 text-sm">Start typing to search your rated films</p>
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
          from { opacity: 0; transform: scale(0.95) translateY(-20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes modalContentOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.95) translateY(-20px); }
        }
        .modal-opening { animation: modalOverlayIn 0.25s ease-out forwards; }
        .modal-closing { animation: modalOverlayOut 0.2s ease-in forwards; }
        .modal-content-opening { animation: modalContentIn 0.25s ease-out forwards; }
        .modal-content-closing { animation: modalContentOut 0.2s ease-in forwards; }
      `}</style>
    </div>
  );
}
