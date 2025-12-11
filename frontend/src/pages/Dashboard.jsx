import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AddMovies from "../pages/AddMovies";
import MyMovies from "../pages/MyMovies";
import Discover from "../pages/Discover";
import Profile from "../pages/Profile";

export default function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const pathSegments = location.pathname.split("/");
  const currentTab = pathSegments[2] || "dashboard";

  const handleTabClick = (tab) => {
    if (tab === "dashboard") navigate(`/dashboard`);
    else navigate(`/dashboard/${tab}`);
  };

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-950 text-slate-50">
      <Navbar
        loggedIn={true}
        onLogout={onLogout}
        activeTab={currentTab}
        setActiveTab={handleTabClick}
      />

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentTab === "dashboard" && (
          <div className="flex-1 w-full overflow-y-auto px-6 py-12">
            <div className="max-w-7xl mx-auto w-full">
              <div className="mb-12">
                <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Cinema Hub</h1>
                <p className="text-slate-400">Stay updated with the film world</p>
              </div>

              {/* Upcoming Releases */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Upcoming Releases</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { 
                      title: 'Dune: Prophecy', 
                      date: 'Jan 15, 2025', 
                      director: 'Denis Villeneuve',
                      image: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'
                    },
                    { 
                      title: 'Captain America: Brave New World', 
                      date: 'Feb 12, 2025', 
                      director: 'Julius Onah',
                      image: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg'
                    },
                    { 
                      title: 'Nosferatu', 
                      date: 'Dec 25, 2024', 
                      director: 'Robert Eggers',
                      image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg'
                    },
                  ].map((film, i) => (
                    <div key={i} className="group cursor-pointer">
                      <div className="relative aspect-video rounded-lg overflow-hidden mb-3 bg-slate-900 ring-1 ring-slate-700 hover:ring-purple-400/50 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/20">
                        <img 
                          src={film.image}
                          alt={film.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h3 className="font-semibold text-sm text-slate-50 line-clamp-2 mb-1">{film.title}</h3>
                            <p className="text-xs text-slate-300">{film.director}</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">{film.date}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cinema News */}
              <div>
                <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Cinema News</h2>
                <div className="space-y-4">
                  {[
                    { 
                      headline: 'Christopher Nolan Announces New Project', 
                      source: 'Variety',
                      image: 'https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg'
                    },
                    { 
                      headline: 'A24 Acquires Rights to 5 International Films', 
                      source: 'The Hollywood Reporter',
                      image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'
                    },
                    { 
                      headline: 'Oscars 2025: Major Contenders Emerge', 
                      source: 'Deadline',
                      image: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg'
                    },
                  ].map((news, i) => (
                    <div key={i} className="flex gap-4 border border-slate-800 rounded-lg p-4 hover:border-purple-400/50 transition group cursor-pointer hover:shadow-lg hover:shadow-purple-500/10">
                      <img 
                        src={news.image}
                        alt={news.headline}
                        className="w-20 h-28 object-cover rounded flex-shrink-0 ring-1 ring-slate-700"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-50 mb-1 group-hover:text-purple-300 transition line-clamp-2">{news.headline}</h3>
                        <p className="text-sm text-slate-400">{news.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === "discover" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <Discover />
          </div>
        )}

        {currentTab === "rate" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <AddMovies />
          </div>
        )}

        {currentTab === "library" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <MyMovies />
          </div>
        )}

        {currentTab === "profile" && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <Profile />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}