import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Calendar, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { getMovieUrl } from '../utils/urlUtils';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export default function PersonDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [credits, setCredits] = useState({ cast: [], crew: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('acting');
  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    const fetchPersonDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const [personRes, creditsRes] = await Promise.all([
          fetch(`${TMDB_BASE_URL}/person/${id}?api_key=${API_KEY}&language=en-US`),
          fetch(`${TMDB_BASE_URL}/person/${id}/movie_credits?api_key=${API_KEY}`)
        ]);

        if (!personRes.ok || !creditsRes.ok) {
          throw new Error('Failed to fetch person details');
        }

        const personData = await personRes.json();
        const creditsData = await creditsRes.json();

        setPerson(personData);
        setCredits(creditsData);

        const actingCount = creditsData.cast?.length || 0;
        const directingCount = creditsData.crew?.filter(c => c.job === 'Director').length || 0;
        
        if (directingCount > actingCount) {
          setActiveTab('directing');
        }
      } catch {
        setError('Failed to load person details');
      } finally {
        setLoading(false);
      }
    };

    fetchPersonDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-950">
        <Navbar loggedIn={true} />
        <div className="flex-1 flex items-center justify-center text-slate-50">
          <div className="cm-spinner animate-spin rounded-full h-12 w-12"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-950">
        <Navbar loggedIn={true} />
        <div className="flex-1 overflow-y-auto app-scroll">
          <div className="min-h-full bg-slate-950 text-slate-50 px-6 py-12">
            <div className="max-w-7xl mx-auto">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition mb-6"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Go Back
              </button>
              <div className="bg-slate-900/60 border border-blue-500/40 rounded-lg p-6">
                <p className="text-slate-100">{error || 'Person not found'}</p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const actingRoles = credits.cast
    .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));

  const directingRoles = credits.crew
    .filter(movie => movie.job === 'Director')
    .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));

  const showTabs = actingRoles.length > 0 && directingRoles.length > 0;
  const displayMovies = showTabs 
    ? (activeTab === 'acting' ? actingRoles : directingRoles)
    : (actingRoles.length > 0 ? actingRoles : directingRoles);

  const bioParagraphs = person.biography ? person.biography.split('\n\n').filter(p => p.trim()) : [];
  const firstParagraph = bioParagraphs[0] || '';
  const restOfBio = bioParagraphs.slice(1).join('\n\n');
  const hasMoreBio = restOfBio.length > 0;

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-950">
      <Navbar loggedIn={true} />
      
      <div className="flex-1 overflow-y-auto app-scroll">
        <div className="min-h-full bg-slate-950 text-slate-50 px-6 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition mb-8 group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Go Back
            </button>

            <div className="flex flex-col md:flex-row gap-8 mb-12">
              {/* Profile Photo */}
              <div className="flex-shrink-0">
                {person.profile_path ? (
                  <img
                    src={`${TMDB_IMAGE_BASE}/w500${person.profile_path}`}
                    alt={person.name}
                    className="w-64 rounded-lg shadow-2xl ring-1 ring-slate-700"
                  />
                ) : (
                  <div className="w-64 h-80 bg-slate-800 rounded-lg flex items-center justify-center">
                    <User className="w-24 h-24 text-slate-600" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-4 text-slate-50">
                  {person.name}
                </h1>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-6 mb-6">
                  {person.birthday && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">
                        {new Date(person.birthday).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}

                  {person.place_of_birth && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">{person.place_of_birth}</span>
                    </div>
                  )}
                </div>

                {/* Department */}
                {person.known_for_department && (
                  <div className="mb-6">
                    <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm">
                      {person.known_for_department}
                    </span>
                  </div>
                )}

                {/* Biography */}
                {person.biography && (
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Biography</h3>
                    <div className="text-slate-300 leading-relaxed">
                      <p className="whitespace-pre-line">{firstParagraph}</p>
                      
                      {hasMoreBio && (
                        <>
                          {bioExpanded && (
                            <p className="whitespace-pre-line mt-4">{restOfBio}</p>
                          )}
                          
                          <button
                            onClick={() => setBioExpanded(!bioExpanded)}
                            className="flex items-center gap-2 mt-4 text-blue-500 hover:text-blue-500 transition text-sm font-medium group"
                          >
                            {bioExpanded ? (
                              <>
                                Show Less
                                <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                              </>
                            ) : (
                              <>
                                Read More
                                <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filmography */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-50">
                  Filmography
                </h2>
                
                {showTabs && (
                  <div className="flex gap-2 bg-slate-900 rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab('acting')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                        activeTab === 'acting'
                          ? 'bg-blue-500 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Acting ({actingRoles.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('directing')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                        activeTab === 'directing'
                          ? 'bg-blue-500 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Directing ({directingRoles.length})
                    </button>
                  </div>
                )}
              </div>

              {displayMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {displayMovies.map(movie => (
                    <button
                      key={movie.id}
                      onClick={() => navigate(getMovieUrl(movie.id, movie.title))}
                      className="group text-left"
                    >
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-slate-900 ring-1 ring-slate-700 hover:ring-blue-500/50 transition-all mb-2 group-hover:scale-105">
                        {movie.poster_path ? (
                          <img
                            src={`${TMDB_IMAGE_BASE}/w500${movie.poster_path}`}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs p-2 text-center">
                            No poster available
                          </div>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm group-hover:text-blue-500 transition line-clamp-2">
                        {movie.title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA'}
                        {movie.character && ` • ${movie.character}`}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-12">No filmography available</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
