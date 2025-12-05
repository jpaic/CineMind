import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Logo from '../assets/logo.png';

export default function Landing() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Navbar loggedIn={false} />

      <section className="flex flex-col items-center justify-center flex-1 text-center px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        
        <img
          src={Logo}
          alt="Logo"
          className={`w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mb-6 transition-opacity duration-700 delay-100 ${show ? 'opacity-100' : 'opacity-0'}`}
        />

        <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 transition-opacity duration-700 delay-300 ${show ? 'opacity-100' : 'opacity-0'}`}>
          Never Run Out of Movies to Watch
        </h1>

        <p className={`text-base sm:text-lg md:text-xl mb-8 max-w-xl sm:max-w-2xl text-gray-300 transition-opacity duration-700 delay-500 ${show ? 'opacity-100' : 'opacity-0'}`}>
          Discover new films perfectly suited to your tastes.
        </p>

        <button
          className={`w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-6 sm:px-8 py-3 rounded-md font-semibold text-lg transition-opacity duration-700 delay-700 ${show ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => window.location.href = '/login?signup=true'}
        >
          Get Started
        </button>
      </section>

      <Footer />
    </div>
  );
}
