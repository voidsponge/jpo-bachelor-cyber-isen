import { useState, useEffect } from "react";
import { Trophy, TrendingUp } from "lucide-react";

interface BreakingNewsOverlayProps {
  isVisible: boolean;
  newLeader: string;
  previousLeader?: string;
  score: number;
  onComplete: () => void;
}

const BreakingNewsOverlay = ({ 
  isVisible, 
  newLeader, 
  previousLeader, 
  score, 
  onComplete 
}: BreakingNewsOverlayProps) => {
  const [stage, setStage] = useState<"enter" | "show" | "exit">("enter");

  useEffect(() => {
    if (isVisible) {
      setStage("enter");
      
      // Show animation stages
      const showTimer = setTimeout(() => setStage("show"), 100);
      const exitTimer = setTimeout(() => {
        setStage("exit");
        setTimeout(onComplete, 500);
      }, 5000);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(exitTimer);
      };
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      {/* Darkened background */}
      <div 
        className={`absolute inset-0 bg-black/60 transition-opacity duration-500 ${
          stage === "enter" ? "opacity-0" : stage === "exit" ? "opacity-0" : "opacity-100"
        }`} 
      />
      
      {/* Breaking News Banner */}
      <div 
        className={`relative w-full max-w-4xl mx-4 transition-all duration-500 ${
          stage === "enter" 
            ? "opacity-0 scale-95 translate-y-8" 
            : stage === "exit" 
            ? "opacity-0 scale-105 -translate-y-8" 
            : "opacity-100 scale-100 translate-y-0"
        }`}
      >
        {/* Red ticker bar top */}
        <div className="h-2 bg-red-600 rounded-t-lg animate-pulse" />
        
        {/* Main content */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-x-4 border-red-600 p-6">
          {/* Breaking News header */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            <div className="flex items-center gap-2 px-4 py-1 bg-red-600 text-white font-bold font-mono text-sm tracking-widest animate-pulse">
              <span>⚡</span>
              BREAKING NEWS
              <span>⚡</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          </div>

          {/* Leader announcement */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="h-12 w-12 text-yellow-400 animate-bounce" />
              <h2 className="text-4xl md:text-5xl font-mono font-bold text-white">
                NOUVEAU LEADER
              </h2>
              <Trophy className="h-12 w-12 text-yellow-400 animate-bounce" />
            </div>

            <div className="space-y-2">
              <p className="text-5xl md:text-7xl font-mono font-black text-primary glow-text">
                {newLeader}
              </p>
              
              <div className="flex items-center justify-center gap-4 text-xl md:text-2xl text-muted-foreground font-mono">
                <TrendingUp className="h-6 w-6 text-green-400" />
                <span className="text-green-400 font-bold">{score} points</span>
              </div>

              {previousLeader && previousLeader !== newLeader && (
                <p className="text-lg text-muted-foreground font-mono mt-4 animate-pulse">
                  🔥 Détrône <span className="text-red-400 font-bold">{previousLeader}</span> !
                </p>
              )}
            </div>
          </div>

          {/* Scrolling ticker */}
          <div className="mt-6 overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap">
              {[...Array(10)].map((_, i) => (
                <span key={i} className="text-sm font-mono text-yellow-400/80 mx-8">
                  🏆 {newLeader} PREND LA TÊTE DU CLASSEMENT • {score} PTS •
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Red ticker bar bottom */}
        <div className="h-2 bg-red-600 rounded-b-lg animate-pulse" />
      </div>
    </div>
  );
};

export default BreakingNewsOverlay;