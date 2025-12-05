import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-gray-900 text-gray-400 text-center p-4 mt-auto">
      © {new Date().getFullYear()} CineMind All rights reserved.
    </footer>
  );
}
