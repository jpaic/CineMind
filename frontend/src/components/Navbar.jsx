import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { FiSettings } from 'react-icons/fi';
import { authUtils } from '../utils/authUtils';
import logo from '../assets/logo.png';

export default function Navbar({ loggedIn, onLogout, onStartTransition, onNavigateToHome }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const isLandingPage = location.pathname === '/';
  const isAuthPage = location.pathname.startsWith('/login');
  const isAppPage = loggedIn && !isLandingPage && !isAuthPage;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    
    // Close menus immediately
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    
    // CRITICAL: Clear auth FIRST, before any other operations
    authUtils.clearAuth();
    
    // Call parent's logout handler to update state
    if (onLogout) {
      onLogout();
    }
    
    // Small delay to ensure state updates propagate
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 50);
  };

  const handleLoginClick = () => {
    // Re-check authentication status at click time to avoid stale checks
    const isAuth = authUtils.isAuthenticated();
    
    if (isAuth) {
      // Has valid auth - show transition before going to home
      if (onStartTransition) {
        onStartTransition();
      }
    } else {
      // Not authenticated - go to login
      navigate('/login');
    }
    setMobileMenuOpen(false);
  };

  const handleSignupClick = () => {
    // Re-check authentication status at click time to avoid stale checks
    const isAuth = authUtils.isAuthenticated();
    
    if (isAuth) {
      // Has valid auth - show transition before going to home
      if (onStartTransition) {
        onStartTransition();
      }
    } else {
      // Not authenticated - go to signup
      navigate('/login?signup=true');
    }
    setMobileMenuOpen(false);
  };

  const menuButtons = loggedIn
    ? [
        { label: 'Discover', path: '/discover' },
        { label: 'Add Movies', path: '/rate' },
        { label: 'My Movies', path: '/library' },
        { label: 'Watchlist', path: '/watchlist' },
        { label: 'Profile', path: '/profile' },
      ]
    : [];

  const isActivePath = (path) => location.pathname === path;

  const renderNavButton = (btn) => (
    <button
      key={btn.path}
      className="relative py-2 px-3 font-semibold cursor-pointer transition-all duration-200 group"
      onClick={() => {
        navigate(btn.path);
        setMobileMenuOpen(false);
      }}
    >
      {btn.label}
      <span
        className={`absolute left-0 bottom-0 w-full h-0.5 transform scale-x-0 origin-center transition-transform duration-300
          ${isActivePath(btn.path) ? 'scale-x-100 bg-blue-500' : 'group-hover:scale-x-100 bg-gray-600'} 
        `}
      ></span>
    </button>
  );

  return (
    <nav className="w-full bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => {
              navigate('/home');
            }}
          >
            <img src={logo} alt="Logo" className="w-10 h-10 mr-3" />
            <span className="text-2xl font-bold">CineMind</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {/* Search Bar */}
            {loggedIn && isAppPage && (
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-9 pr-9 py-1.5 rounded-lg bg-slate-800 text-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>
            )}
            
            {loggedIn && isAppPage && menuButtons.map(renderNavButton)}
            
            {!loggedIn && isLandingPage && (
              <>
                <button
                  className="px-4 py-2 text-white hover:text-blue-400 transition"
                  onClick={handleLoginClick}
                >
                  Login
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                  onClick={handleSignupClick}
                >
                  Sign Up
                </button>
              </>
            )}
            
            {loggedIn && isAppPage && (
              <div className="relative ml-4" ref={dropdownRef}>
                <button
                  className="p-2 rounded-full hover:bg-gray-700 transition cursor-pointer"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <FiSettings className="w-6 h-6" />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 bg-gray-800 rounded-md shadow-lg py-2 z-50 min-w-[10rem]">
                    <div className="absolute -top-2 right-3 w-3 h-3 bg-gray-800 rotate-45"></div>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 transition text-sm cursor-pointer"
                      onClick={() => {
                        navigate('/settings');
                        setDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }}
                    >
                      Settings
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 transition text-sm cursor-pointer"
                      onClick={() => {
                        navigate('/help');
                        setDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }}
                    >
                      Help / FAQ
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 transition text-sm cursor-pointer"
                      onClick={() => {
                        navigate('/legal/privacy-policy');
                        setDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }}
                    >
                      Privacy Policy
                    </button>
                    <hr className="border-gray-700 my-1" />
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-red-700 text-red-500 font-semibold transition rounded-b-md text-sm cursor-pointer"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden flex items-center">
            {!isAuthPage && (
              <button
                className="flex flex-col justify-center items-center w-8 h-8 relative cursor-pointer"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className={`block absolute h-0.5 w-8 bg-white transform transition duration-300 ease-in-out ${mobileMenuOpen ? 'rotate-45' : '-translate-y-2'}`}></span>
                <span className={`block absolute h-0.5 w-8 bg-white transform transition duration-300 ease-in-out ${mobileMenuOpen ? 'opacity-0' : 'translate-y-0'}`}></span>
                <span className={`block absolute h-0.5 w-8 bg-white transform transition duration-300 ease-in-out ${mobileMenuOpen ? '-rotate-45' : 'translate-y-2'}`}></span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div
          className={`md:hidden flex flex-col items-center space-y-2 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-[1000px] pb-4' : 'max-h-0'
          }`}
        >
          {/* Mobile Search */}
          {loggedIn && isAppPage && (
            <form onSubmit={handleSearchSubmit} className="w-full px-2 pt-2">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-9 py-2 rounded-lg bg-slate-800 text-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          )}
          
          {!loggedIn && isLandingPage && (
            <>
              <button
                className="w-full text-center py-2 px-3 hover:text-blue-400 transition cursor-pointer"
                onClick={handleLoginClick}
              >
                Login
              </button>
              <button
                className="w-full text-center py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition cursor-pointer"
                onClick={handleSignupClick}
              >
                Sign Up
              </button>
            </>
          )}
          {loggedIn && isAppPage && menuButtons.map(renderNavButton)}
          {loggedIn && isAppPage && (
            <div className="flex flex-col items-center space-y-1 w-full pt-2">
              <button className="w-full text-center py-2 px-3 hover:bg-gray-700 transition rounded-md cursor-pointer" onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }}>Settings</button>
              <button className="w-full text-center py-2 px-3 hover:bg-gray-700 transition rounded-md cursor-pointer" onClick={() => { navigate('/help'); setMobileMenuOpen(false); }}>Help / FAQ</button>
              <button className="w-full text-center py-2 px-3 hover:bg-gray-700 transition rounded-md cursor-pointer" onClick={() => { navigate('/legal/privacy-policy'); setMobileMenuOpen(false); }}>Privacy Policy</button>
              <button className="w-full text-center py-2 px-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md transition cursor-pointer" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
