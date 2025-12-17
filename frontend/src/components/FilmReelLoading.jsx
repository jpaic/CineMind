import React from 'react';

export default function FilmReelLoading({ isVisible, message = "Loading..." }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto">
      {/* Background */}
           <div
            className="absolute inset-0 bg-gradient-to-br 
              from-blue-900/20 
              via-blue-950/25 
              via-slate-950/30 
              to-black/35 
              backdrop-blur-sm"
          />

          {/* Content */}
          <div className="relative z-[10000] flex flex-col items-center justify-center gap-5">

            {/* Film Reel */}
            <div className="relative w-32 h-32">
              {/* Main rotating reel */}
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: "2s", animationTimingFunction: "linear" }}>
                {/* Outer rim */}
                <div className="absolute inset-0 rounded-full border-[5px] border-blue-200/80" />
                
                {/* Center hole */}
                <div className="absolute w-4 h-4 rounded-full bg-black/70 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                
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
                        animation: `holeFillEmpty 4s linear infinite`,
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
                        animation: `holeFillEmpty 4s linear infinite`,
                        animationDelay: `${-(angle / 360) * 2}s`
                      }}
                    />
                  );
                })}
              </div>
              
              <style>{`
                @keyframes holeFillEmpty {
                  0% { background-color: rgba(0, 0, 0, 0.7); }
                  3% { background-color: rgba(0, 0, 0, 0.6); }
                  6% { background-color: rgba(0, 0, 0, 0.4); }
                  9% { background-color: rgba(0, 0, 0, 0.2); }
                  12% { background-color: transparent; }
                  38% { background-color: transparent; }
                  41% { background-color: rgba(0, 0, 0, 0.2); }
                  44% { background-color: rgba(0, 0, 0, 0.4); }
                  47% { background-color: rgba(0, 0, 0, 0.6); }
                  50% { background-color: rgba(0, 0, 0, 0.7); }
                  100% { background-color: rgba(0, 0, 0, 0.7); }
                }
              `}</style>
        </div>

        {/* Loading text */}
        <p className="text-lg font-semibold text-blue-100">
          {message}
        </p>
      </div>
    </div>
  );
}