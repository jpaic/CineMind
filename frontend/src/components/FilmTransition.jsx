import React, { useState, useMemo, useEffect } from 'react';

const FilmStripRow = ({ delay, index }) => {
  const colors = [
    'from-slate-800 via-slate-700 to-slate-800',
    'from-slate-800 via-slate-600 to-slate-800',
    'from-gray-800 via-gray-700 to-gray-800',
    'from-slate-700 via-slate-600 to-slate-700',
    'from-gray-800 via-slate-700 to-gray-800',
  ];
  
  const tints = [
    'bg-orange-500/5',
    'bg-blue-500/5',
    'bg-blue-500/5',
    'bg-amber-500/5',
    'bg-cyan-500/5',
  ];
  
  const colorClass = colors[index % colors.length];
  const tintClass = tints[index % tints.length];
  
  return (
    <div className="film-strip" style={{ animationDelay: `${delay}ms` }}>
      <div className={`absolute inset-0 ${tintClass}`} />

      {/* Top sprockets */}
      <div className="flex absolute top-0 left-0 right-0 h-3 gap-4 bg-slate-900 overflow-hidden">
        {[...Array(100)].map((_, i) => (
          <div key={`top-${i}`} className="w-2 h-2 bg-slate-950 rounded-full mt-0.5 flex-shrink-0" />
        ))}
      </div>

      {/* Film frame */}
      <div className={`absolute inset-0 top-3 bottom-3 bg-gradient-to-r ${colorClass}`}>
        <div className="absolute inset-0 film-grain opacity-20" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="film-scratch" style={{ left: `${20 + index * 15}%` }} />
          <div className="film-scratch" style={{ left: `${60 + index * 10}%` }} />
        </div>
        <div className="absolute inset-0 vignette" />
      </div>

      {/* Bottom sprockets */}
      <div className="flex absolute bottom-0 left-0 right-0 h-3 gap-4 bg-slate-900 overflow-hidden">
        {[...Array(100)].map((_, i) => (
          <div key={`bottom-${i}`} className="w-2 h-2 bg-slate-950 rounded-full mt-0.5 flex-shrink-0" />
        ))}
      </div>
    </div>
  );
};

export default function FilmTransition({ onComplete }) {
  const [completed, setCompleted] = useState(false);
  const rows = 7;

  // Staggered delays
  const delays = useMemo(() => {
    const baseDelays = Array.from({ length: rows }, (_, i) => i * 60);
    return baseDelays.sort(() => Math.random() - 0.5);
  }, [rows]);

  const maxDelay = Math.max(...delays);
  const totalDuration = maxDelay + 2100; // 2100ms = slide animation duration

  // Trigger onComplete after total duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setCompleted(true);
      if (onComplete) onComplete();
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [totalDuration, onComplete]);

  return (
    <div className="film-transition fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {delays.map((delay, i) => (
        <FilmStripRow key={i} delay={delay} index={i} />
      ))}
    </div>
  );
}
