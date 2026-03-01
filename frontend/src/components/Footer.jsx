import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-950 text-slate-400 text-center p-4 mt-auto">
      © {new Date().getFullYear()} CineMind All rights reserved.
    </footer>
  );
}
