import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Card from "../components/Card";
import CardSkeleton from "../components/CardSkeleton";
import { tmdbService } from "../api/tmdb";
import { weeklyBriefService } from "../api/weeklyBrief";

export default function Home({ onLogout }) {
  const navigate = useNavigate();

  // TMDB API state
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [featuredPeople, setFeaturedPeople] = useState([]);
  const [weeklyBrief, setWeeklyBrief] = useState({ dateRange: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUpcoming, setShowUpcoming] = useState(true);

  // Hardcoded Cinema News
  const cinemaNews = [
    {
      headline: "Christopher Nolan's Next Film Sets July 2026 Release Date",
      description: "Universal Pictures confirms a summer release for Nolan's latest original feature.",
      source: "Variety",
      image: "https://img.logo.dev/variety.com?token=pk_Njb2Bg3ySle5ZdsTqsfQpA&size=200&format=png&retina=true",
      url: "https://variety.com",
      timeAgo: "2 days ago"
    },
    {
      headline: "A24 Leads Independent Spirit Awards With 12 Nominations",
      description: "The indie powerhouse dominates major categories as awards season heats up.",
      source: "The Hollywood Reporter",
      image: "https://img.logo.dev/hollywoodreporter.com?token=pk_Njb2Bg3ySle5ZdsTqsfQpA&size=200&format=png&retina=true",
      url: "https://hollywoodreporter.com",
      timeAgo: "3 days ago"
    },
    {
      headline: "Cannes Film Festival Reveals 2025 Competition Lineup",
      description: "Festival organizers announce a director-driven slate for the upcoming edition.",
      source: "Deadline",
      image: "https://img.logo.dev/deadline.com?token=pk_Njb2Bg3ySle5ZdsTqsfQpA&size=200&format=png&retina=true",
      url: "https://deadline.com",
      timeAgo: "5 days ago"
    },
    {
      headline: "Warner Bros. Unveils Ambitious 2025–2026 Theatrical Slate",
      description: "Major franchises and original projects headline the studio's roadmap.",
      source: "IndieWire",
      image: "https://img.logo.dev/indiewire.com?token=pk_Njb2Bg3ySle5ZdsTqsfQpA&size=200&format=png&retina=true",
      url: "https://indiewire.com",
      timeAgo: "6 days ago"
    }
  ];

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    const contentArea = document.querySelector('.app-scroll');
    if (contentArea) {
      contentArea.scrollTo(0, 0);
    }
  }, []);

  // Fetch TMDB data on mount
  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        
        const [moviesData, popularData, peopleData] = await Promise.allSettled([
          tmdbService.getUpcomingShowcase(),
          tmdbService.getPopularShowcase(),
          tmdbService.getTrendingPeople()
        ]);
        
        
        // Handle upcoming movies
        if (moviesData.status === 'fulfilled') {
          setUpcomingMovies(moviesData.value || []);
          
          const brief = await weeklyBriefService.generateBrief(moviesData.value || []);
          setWeeklyBrief(brief);
        } else {
          setUpcomingMovies([]);
        }
        
        // Handle popular movies
        if (popularData.status === 'fulfilled') {
          setPopularMovies(popularData.value || []);
        } else {
          setPopularMovies([]);
        }
        
        // Handle people
        if (peopleData.status === 'fulfilled') {
          setFeaturedPeople(peopleData.value || []);
        } else {
          setFeaturedPeople([]);
        }
      } catch (err) {
        setError('Failed to load content. Please refresh the page.');
        setUpcomingMovies([]);
        setPopularMovies([]);
        setFeaturedPeople([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // Auto-rotate between upcoming and popular every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowUpcoming(prev => !prev);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-950 text-slate-50">
      <Navbar loggedIn={true} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 w-full overflow-y-auto app-scroll">
          <div className="px-6 py-12">
            <div className="max-w-7xl mx-auto w-full">
              {/* Header */}
              <div className="mb-12">
                <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  Cinema Hub
                </h1>
                <p className="text-slate-400">Stay updated with the film world</p>
              </div>

              {/* Loading State with Skeletons */}
              {loading && (
                <>
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                      Upcoming Releases
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
                    </div>
                  </div>
                  
                  <div className="mb-12">
                    <div className="bg-gradient-to-br from-purple-900/20 to-cyan-900/20 border border-purple-500/30 rounded-xl p-8 animate-pulse">
                      <div className="h-4 bg-slate-800 rounded w-1/4 mb-4"></div>
                      <div className="space-y-3">
                        <div className="h-3 bg-slate-800 rounded w-full"></div>
                        <div className="h-3 bg-slate-800 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                      Featured Talent
                    </h2>
                    <div className="flex gap-6 overflow-x-auto pb-4">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex-shrink-0 w-48">
                          <CardSkeleton isPerson={true} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-8">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {/* Rotating Movies Section - Upcoming / Popular */}
              {!loading && (
                <div className="mb-12 relative overflow-hidden -mx-2" style={{ minHeight: '600px' }}>
                  {/* Navigation Arrows */}
                  <button
                    onClick={() => setShowUpcoming(true)}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-slate-900/80 backdrop-blur-sm border border-slate-700 hover:border-purple-400 transition-all duration-300 ${
                      showUpcoming ? 'opacity-50 cursor-not-allowed' : 'opacity-100 hover:scale-110'
                    }`}
                    disabled={showUpcoming}
                    aria-label="Show upcoming movies"
                  >
                    <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => setShowUpcoming(false)}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-slate-900/80 backdrop-blur-sm border border-slate-700 hover:border-purple-400 transition-all duration-300 ${
                      !showUpcoming ? 'opacity-50 cursor-not-allowed' : 'opacity-100 hover:scale-110'
                    }`}
                    disabled={!showUpcoming}
                    aria-label="Show popular movies"
                  >
                    <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Upcoming Movies Slide */}
                  <div 
                    className="absolute top-0 left-0 w-full transition-transform duration-700 ease-in-out px-2"
                    style={{ 
                      transform: showUpcoming ? 'translateX(0)' : 'translateX(-100%)',
                    }}
                  >
                    <h2 
                      className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 cursor-pointer hover:opacity-80 transition-opacity w-fit"
                      onClick={() => navigate('/upcoming')}
                    >
                      Upcoming Releases
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {upcomingMovies.length === 0 ? (
                        <p className="text-slate-400 col-span-4">No upcoming movies available</p>
                      ) : (
                        upcomingMovies.map((film, i) => (
                          <div key={film.id}>
                            <Card movie={film} showRating={false} index={i} />
                            <p className="text-sm text-slate-400 font-medium mt-3">{film.date}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Popular Movies Slide */}
                  <div 
                    className="absolute top-0 left-0 w-full transition-transform duration-700 ease-in-out px-2"
                    style={{ 
                      transform: showUpcoming ? 'translateX(100%)' : 'translateX(0)',
                    }}
                  >
                    <h2 
                      className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 cursor-pointer hover:opacity-80 transition-opacity w-fit"
                      onClick={() => navigate('/popular')}
                    >
                      Popular Movies
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {popularMovies.length === 0 ? (
                        <p className="text-slate-400 col-span-4">No popular movies available</p>
                      ) : (
                        popularMovies.map((film, i) => (
                          <div key={film.id}>
                            <Card movie={film} showRating={false} index={i} />
                            <p className="text-sm text-slate-400 font-medium mt-3">{film.date}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Weekly Brief */}
              {!loading && (
                <div className="mb-12">
                  <div className="bg-gradient-to-br from-purple-900/20 to-cyan-900/20 border border-purple-500/30 rounded-xl p-8">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg p-3">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                          Weekly Brief
                        </h2>
                        <p className="text-slate-300 text-sm mb-4">
                          {weeklyBrief.dateRange || 'December 9-15, 2024'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4 text-slate-300">
                      {weeklyBrief.content ? (
                        weeklyBrief.content
                          .split('\n\n')
                          .filter(p => p.trim().length > 0)
                          .map((paragraph, idx) => (
                            <p key={idx}>{paragraph.trim()}</p>
                          ))
                      ) : (
                        <>
                          <p>
                            This week in cinema: Robert Eggers' highly anticipated "Nosferatu" remake is set to haunt theaters on Christmas Day, bringing gothic horror back to the big screen. Meanwhile, Denis Villeneuve continues post-production on "Dune: Prophecy," with early test screenings receiving enthusiastic responses from critics.
                          </p>
                          <p>
                            Awards season is heating up as Oscar contenders emerge from the festival circuit. A24's latest acquisitions are generating significant buzz, with five international films poised to make waves in the art house circuit. Industry insiders are already speculating about potential nominations across all major categories.
                          </p>
                          <p className="text-sm text-purple-300 font-medium">
                            Stay tuned for more updates as we approach the 2025 awards season and exciting new releases.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Featured Talent */}
              {!loading && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                    Featured Talent
                  </h2>
                  <div className="relative overflow-visible">
                    <div className="flex gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory talent-scroll">
                      {featuredPeople.length === 0 ? (
                        <p className="text-slate-400">No featured talent available</p>
                      ) : (
                        featuredPeople.map((person, i) => (
                          <div key={person.id} className="flex-shrink-0 w-48 snap-start">
                            <Card movie={person} showRating={false} index={i} isPerson={true} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cinema News Feed */}
              {!loading && (
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                    Cinema News
                  </h2>
                  <div className="space-y-4">
                    {cinemaNews.map((news, i) => (
                      <a 
                        key={i}
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-4 border border-slate-800 rounded-lg p-4 hover:border-purple-400/50 transition group cursor-pointer hover:shadow-lg hover:shadow-purple-500/10"
                      >
                        <img 
                          src={news.image}
                          alt={news.source}
                          className="w-24 h-32 object-cover rounded flex-shrink-0 ring-1 ring-slate-700"
                          onError={(e) => {
                            e.target.src = 'https://img.logo.dev/variety.com?token=pk_Njb2Bg3ySle5ZdsTqsfQpA&size=200&format=png&retina=true';
                          }}
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h3 className="font-semibold text-slate-50 mb-1 group-hover:text-purple-300 transition line-clamp-2">
                            {news.headline}
                          </h3>
                          {news.description && (
                            <p className="text-sm text-slate-400 mb-2 line-clamp-2">{news.description}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-purple-400 font-medium">{news.source}</span>
                            <span className="text-xs text-slate-600">•</span>
                            <span className="text-xs text-slate-500">{news.timeAgo}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
