import React from 'react';

export default function FilmReelLoading({ isVisible, message = "Loading...", blocking = true }) {
  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center ${blocking ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br 
          from-slate-900/40 
          via-slate-800/55 
          via-slate-700/45 
          to-slate-950/80 
          backdrop-blur-sm ${blocking ? '' : 'pointer-events-none'}`}
      />

      {/* Content */}
      <div className="relative z-[10000] flex flex-col items-center justify-center gap-5">

        {/* Film Reel */}
        <div className="relative w-32 h-32">
          {/* Main rotating reel */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "2s", animationTimingFunction: "linear" }}>
            {/* Outer rim */}
            <div className="absolute inset-0 rounded-full border-[5px] border-blue-500/70" />
            
            {/* Center hole */}
            <div className="absolute w-4 h-4 rounded-full bg-slate-950/70 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            
            {/* Inner holes (6) */}
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = i * 60;
              return (
                <div
                  key={`inner-${i}`}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-16px)`,
                    animation: `cm-hole-fill-empty 4s linear infinite`,
                    animationDelay: `${-(angle / 360) * 2}s`
                  }}
                />
              );
            })}
            
            {/* Outer holes (6) */}
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = i * 60;
              return (
                <div
                  key={`outer-${i}`}
                  className="absolute w-6 h-6 rounded-full"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-36px)`,
                    animation: `cm-hole-fill-empty 4s linear infinite`,
                    animationDelay: `${-(angle / 360) * 2}s`
                  }}
                />
              );
            })}
          </div>
          
          <style>{`
            @keyframes holeFillEmpty {
              0% { background-color: color-mix(in srgb, var(--cm-bg) 70%, transparent); }
              3% { background-color: color-mix(in srgb, var(--cm-bg) 60%, transparent); }
              6% { background-color: color-mix(in srgb, var(--cm-surface) 40%, transparent); }
              9% { background-color: color-mix(in srgb, var(--cm-accent-2) 20%, transparent); }
              12% { background-color: transparent; }
              38% { background-color: transparent; }
              41% { background-color: color-mix(in srgb, var(--cm-accent-2) 20%, transparent); }
              44% { background-color: color-mix(in srgb, var(--cm-surface) 40%, transparent); }
              47% { background-color: color-mix(in srgb, var(--cm-bg) 60%, transparent); }
              50% { background-color: color-mix(in srgb, var(--cm-bg) 70%, transparent); }
              100% { background-color: color-mix(in srgb, var(--cm-bg) 70%, transparent); }
            }
          `}</style>
        </div>

        {/* Loading text */}
        <p className="text-lg font-semibold text-slate-100">
          {message}
        </p>
      </div>
    </div>
  );
}