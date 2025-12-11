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

  // Placeholder data
  const upcomingMovies = [
    { 
      title: 'Dune: Prophecy', 
      date: 'Jan 15, 2025', 
      director: 'Alison Schapker',
      image: 'https://image.tmdb.org/t/p/original/oWVohNsxkxA3u92EzRo8fTuXIS0.jpg'
    },
    { 
      title: 'Captain America: Brave New World', 
      date: 'Feb 14, 2025', 
      director: 'Julius Onah',
      image: 'https://image.tmdb.org/t/p/original/mFzFJc1XnGqaEbyac2KcCFJx8Uo.jpg'
    },
    { 
      title: 'Nosferatu', 
      date: 'Dec 25, 2024', 
      director: 'Robert Eggers',
      image: 'https://image.tmdb.org/t/p/original/wQ8MHiyH4ETqSSovpzZmrWAxQ6y.jpg'
    },
    { 
      title: 'Mickey 17', 
      date: 'Mar 7, 2025', 
      director: 'Bong Joon-ho',
      image: 'https://image.tmdb.org/t/p/original/fjIHkLGIZdjKIKe252gSFt5QzVK.jpg'
    },
  ];

  const cinemaNews = [
    { 
      headline: 'Christopher Nolan Announces New Project', 
      source: 'Variety',
      image: 'https://image.tmdb.org/t/p/original/x5JKwcrl7NzaSWfTFh6bIPCsqJd.jpg'
    },
    { 
      headline: 'A24 Acquires Rights to 5 International Films', 
      source: 'The Hollywood Reporter',
      image: 'https://img.logo.dev/a24films.com?token=pk_Njb2Bg3ySle5ZdsTqsfQpA&size=200&format=png&retina=true'
    },
    { 
      headline: 'Oscars 2025: Major Contenders Emerge', 
      source: 'Deadline',
      image: 'https://img.logo.dev/oscars.org?token=pk_Njb2Bg3ySle5ZdsTqsfQpA&size=200&format=png&retina=true'
    },
    { 
      headline: 'Netflix Greenlights Three Original Series', 
      source: 'IndieWire',
      image: 'https://img.logo.dev/netflix.com?token=pk_Njb2Bg3ySle5ZdsTqsfQpA&size=200&format=png&retina=true'
    },
    { 
      headline: 'Cannes Film Festival Announces 2025 Lineup', 
      source: 'Screen Daily',
      image: 'https://img.logo.dev/festival-cannes.com?token=pk_Njb2Bg3ySle5ZdsTqsfQpA&size=200&format=png&retina=true'
    },
  ];

  const featuredPeople = [
    {
      name: 'Margot Robbie',
      role: 'Actor',
      notableWork: 'Barbie, I, Tonya',
      image: 'https://image.tmdb.org/t/p/w500/euDPyqLnuwaWMHajcU3oZ9uZezR.jpg'
    },
    {
      name: 'Denis Villeneuve',
      role: 'Director',
      notableWork: 'Dune, Arrival',
      image: 'https://image.tmdb.org/t/p/original/433lXlkdMGXzrpwnKM4Ul1sln15.jpg'
    },
    {
      name: 'Florence Pugh',
      role: 'Actor',
      notableWork: 'Midsommar, Little Women',
      image: 'https://image.tmdb.org/t/p/w500/6Sjz9teWjrMY9lF2o9FCo4XmoRh.jpg'
    },
    {
      name: 'Greta Gerwig',
      role: 'Director',
      notableWork: 'Barbie, Lady Bird',
      image: 'https://image.tmdb.org/t/p/original/6MwQ2GstYr0wnhp1eTOAbVMNBGN.jpg'
    },
    {
      name: 'Timothée Chalamet',
      role: 'Actor',
      notableWork: 'Dune, Call Me By Your Name',
      image: 'https://image.tmdb.org/t/p/w500/BE2sdjpgsa2rNTFa66f7upkaOP.jpg'
    },
  ];

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
              {/* Header */}
              <div className="mb-12">
                <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Cinema Hub</h1>
                <p className="text-slate-400">Stay updated with the film world</p>
              </div>

              {/* 1. Upcoming Releases */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Upcoming Releases</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {upcomingMovies.map((film, i) => (
                    <div key={i} className="group cursor-pointer">
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-3 bg-slate-900 ring-1 ring-slate-700 hover:ring-purple-400/50 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/20">
                        <img 
                          src={film.image}
                          alt={film.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="font-semibold text-sm text-slate-50 line-clamp-2 mb-1">{film.title}</h3>
                            <p className="text-xs text-slate-300">{film.director}</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 font-medium">{film.date}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Newsletter / Weekly Brief */}
              <div className="mb-12">
                <div className="bg-gradient-to-br from-purple-900/20 to-cyan-900/20 border border-purple-500/30 rounded-xl p-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg p-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Weekly Brief</h2>
                      <p className="text-slate-300 text-sm mb-4">December 8-14, 2024</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-slate-300">
                    <p>
                      This week in cinema: Robert Eggers' highly anticipated "Nosferatu" remake is set to haunt theaters on Christmas Day, bringing gothic horror back to the big screen. Meanwhile, Denis Villeneuve continues post-production on "Dune: Prophecy," with early test screenings receiving enthusiastic responses from critics.
                    </p>
                    <p>
                      Awards season is heating up as Oscar contenders emerge from the festival circuit. A24's latest acquisitions are generating significant buzz, with five international films poised to make waves in the art house circuit. Industry insiders are already speculating about potential nominations across all major categories.
                    </p>
                    <p className="text-sm text-purple-300 font-medium">
                      Stay tuned for more updates as we approach the 2025 awards season and exciting new releases.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Actor / Director Highlights */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Featured Talent</h2>
                <div className="relative">
                  <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                    {featuredPeople.map((person, i) => (
                      <div key={i} className="flex-shrink-0 w-48 snap-start group cursor-pointer">
                        <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3 bg-slate-900 ring-1 ring-slate-700 hover:ring-purple-400/50 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/20">
                          <img 
                            src={person.image}
                            alt={person.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <span className="inline-block px-2 py-1 bg-purple-500/80 text-white text-xs rounded-full mb-2">{person.role}</span>
                            <h3 className="font-bold text-white text-lg mb-1">{person.name}</h3>
                            <p className="text-xs text-slate-300 line-clamp-2">{person.notableWork}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Cinema News Feed */}
              <div>
                <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Cinema News</h2>
                <div className="space-y-4">
                  {cinemaNews.map((news, i) => (
                    <div key={i} className="flex gap-4 border border-slate-800 rounded-lg p-4 hover:border-purple-400/50 transition group cursor-pointer hover:shadow-lg hover:shadow-purple-500/10">
                      <img 
                        src={news.image}
                        alt={news.headline}
                        className="w-24 h-32 object-cover rounded flex-shrink-0 ring-1 ring-slate-700"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h3 className="font-semibold text-slate-50 mb-2 group-hover:text-purple-300 transition line-clamp-2">{news.headline}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-purple-400 font-medium">{news.source}</span>
                          <span className="text-xs text-slate-600">•</span>
                          <span className="text-xs text-slate-500">2 hours ago</span>
                        </div>
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