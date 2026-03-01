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
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      <style>{`
        .film-strip {
          position: absolute;
          left: 0;
          right: 0;
          height: calc(100% / 7);
          transform: translateX(100%);
          animation: slideInOut 2.1s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }

        /* Position each strip */
        .film-strip:nth-child(1) { top: 0; }
        .film-strip:nth-child(2) { top: calc(100% / 7); }
        .film-strip:nth-child(3) { top: calc(200% / 7); }
        .film-strip:nth-child(4) { top: calc(300% / 7); }
        .film-strip:nth-child(5) { top: calc(400% / 7); }
        .film-strip:nth-child(6) { top: calc(500% / 7); }
        .film-strip:nth-child(7) { top: calc(600% / 7); }

        /* Slide in and out animation */
        @keyframes slideInOut {
          0% { transform: translateX(100%); filter: blur(0px); }
          15% { filter: blur(1.5px); }
          35% { transform: translateX(0%); filter: blur(0px); }
          60% { transform: translateX(0%); }
          75% { filter: blur(1.5px); }
          100% { transform: translateX(-100%); filter: blur(0px); }
        }

        /* Film grain */
        .film-grain {
          background-image: 
            repeating-linear-gradient(0deg, transparent, transparent 2px, color-mix(in srgb, var(--cm-bg) 20%, transparent) 2px, color-mix(in srgb, var(--cm-bg) 20%, transparent) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, color-mix(in srgb, var(--cm-bg) 20%, transparent) 2px, color-mix(in srgb, var(--cm-bg) 20%, transparent) 4px);
          animation: grainShift 0.08s steps(1) infinite;
        }

        @keyframes grainShift {
          0%,100% { transform: translate(0,0); opacity:0.2; }
          50% { transform: translate(-1px,1px); opacity:0.25; }
        }

        .film-scratch {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: linear-gradient(to bottom, 
            transparent 0%, 
            color-mix(in srgb, var(--cm-text) 10%, transparent) 10%,
            transparent 30%,
            color-mix(in srgb, var(--cm-text) 10%, transparent) 50%,
            transparent 70%,
            color-mix(in srgb, var(--cm-accent) 15%, transparent) 85%,
            transparent 100%
          );
          opacity: 0.4;
        }

        .vignette {
          background: radial-gradient(ellipse at center, transparent 30%, color-mix(in srgb, var(--cm-bg) 45%, transparent) 100%);
        }
      `}</style>

      {delays.map((delay, i) => (
        <FilmStripRow key={i} delay={delay} index={i} />
      ))}
    </div>
  );
}
