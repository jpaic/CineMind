import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { authUtils } from './utils/authUtils';
import AppLayout from './components/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Home from './pages/Home';
import Discover from './pages/Discover';
import AddMovies from './pages/AddMovies';
import MyMovies from './pages/MyMovies';
import Watchlist from './pages/Watchlist';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Help from './pages/Help';
import PrivacyPolicy from './pages/PrivacyPolicy';
import MovieDetails from './pages/MovieDetails';
import PersonDetails from './pages/PersonDetails';
import SearchResults from './pages/SearchResults';
import UpcomingMovies from './pages/UpcomingMovies';
import PopularMovies from './pages/PopularMovies';
import FilmTransition from './components/FilmTransition';

function AppContent() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTransition, setShowTransition] = useState(false);
  const navigate = useNavigate();

  // Initialize auth state on mount - verify token with backend
  useEffect(() => {
    const initAuth = async () => {
      
      // First check if token exists
      const hasToken = authUtils.isAuthenticated();
      
      if (!hasToken) {
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      // Token exists, verify it's valid with backend
      const isValid = await authUtils.verifyToken();
      
      setLoggedIn(isValid);
      setLoading(false);

      // If token was invalid and we're on a protected route, it will redirect
    };

    initAuth();
  }, []);

  // Handle start of transition from Landing page (navigate during peak)
  const handleStartTransition = () => {
    setShowTransition(true);
    
    // Navigate at the peak of the transition (~1200ms)
    setTimeout(() => {
      navigate('/home', { replace: true });
    }, 1200);
  };

  // Handle transition animation completion
  const handleTransitionComplete = () => {
    setShowTransition(false);
  };

  // Handle auth completion (simple - just set state)
  const handleAuthComplete = () => {
    setLoggedIn(true);
    navigate('/home', { replace: true });
  };

  // Handle logout
  const handleLogout = () => {
    authUtils.clearAuth();
    setLoggedIn(false);
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      {/* Film strip transition overlay - only for landing page */}
      {showTransition && (
        <FilmTransition onComplete={handleTransitionComplete} />
      )}
      
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={
            <Landing 
              onStartTransition={handleStartTransition}
            />
          } 
        />
        
        <Route 
          path="/login" 
          element={<Login onAuthComplete={handleAuthComplete} />} 
        />

        {/* Protected Routes */}
        <Route
          path="/home"
          element={
            loggedIn ? (
              <Home onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/discover"
          element={
            loggedIn ? (
              <AppLayout onLogout={handleLogout}>
                <Discover />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/rate"
          element={
            loggedIn ? (
              <AppLayout onLogout={handleLogout}>
                <AddMovies />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/library"
          element={
            loggedIn ? (
              <AppLayout onLogout={handleLogout}>
                <MyMovies />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/watchlist"
          element={
            loggedIn ? (
              <AppLayout onLogout={handleLogout}>
                <Watchlist />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/profile"
          element={
            loggedIn ? (
              <AppLayout onLogout={handleLogout}>
                <Profile />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/settings"
          element={
            loggedIn ? (
              <AppLayout onLogout={handleLogout}>
                <Settings />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/help"
          element={
            loggedIn ? (
              <AppLayout onLogout={handleLogout}>
                <Help />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/legal/privacy-policy"
          element={
            loggedIn ? (
              <AppLayout onLogout={handleLogout}>
                <PrivacyPolicy />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/movie/:id/:slug"
          element={
            loggedIn ? (
              <MovieDetails onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        
        <Route
          path="/person/:id/:slug"
          element={
            loggedIn ? (
              <PersonDetails onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/search" 
          element={
            loggedIn ? (
              <SearchResults onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route
          path="/upcoming"
          element={
            loggedIn ? (
              <AppLayout onLogout={handleLogout}>
                <UpcomingMovies />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/popular"
          element={
            loggedIn ? (
              <AppLayout onLogout={handleLogout}>
                <PopularMovies />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={loggedIn ? "/home" : "/"} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
