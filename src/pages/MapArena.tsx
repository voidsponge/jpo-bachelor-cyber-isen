import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Terminal, Loader2, Grid, Lock, Unlock, Skull, Flame, Shield, Eye, Binary, Search, FileSearch } from "lucide-react";
import Navbar from "@/components/Navbar";
import ChallengeModal from "@/components/ChallengeModal";
import TrollOverlay from "@/components/TrollOverlay";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Challenge {
  id: string;
  title: string;
  category: "Web" | "OSINT" | "Crypto" | "Stegano" | "Logic" | "Forensics";
  points: number;
  description: string;
  hint: string | null;
  file_url: string | null;
  solved: boolean;
  difficulty: number;
  isTerminalChallenge?: boolean;
  externalUrl?: string | null;
}

// Zone configuration for dungeon map
const zoneConfig: Record<string, { 
  name: string; 
  icon: React.ElementType; 
  gradient: string;
  glowColor: string;
  position: { x: number; y: number };
  description: string;
}> = {
  Web: { 
    name: "Crypte du Web", 
    icon: Binary,
    gradient: "from-blue-600 via-cyan-500 to-blue-400",
    glowColor: "rgba(59, 130, 246, 0.6)",
    position: { x: 15, y: 25 },
    description: "Explorez les vulnérabilités cachées"
  },
  OSINT: { 
    name: "Tour de Veille", 
    icon: Search,
    gradient: "from-green-600 via-emerald-500 to-green-400",
    glowColor: "rgba(34, 197, 94, 0.6)",
    position: { x: 75, y: 20 },
    description: "Traquez l'information"
  },
  Crypto: { 
    name: "Chambre des Secrets", 
    icon: Shield,
    gradient: "from-yellow-600 via-amber-500 to-yellow-400",
    glowColor: "rgba(234, 179, 8, 0.6)",
    position: { x: 50, y: 15 },
    description: "Déchiffrez les mystères"
  },
  Stegano: { 
    name: "Salle des Illusions", 
    icon: Eye,
    gradient: "from-purple-600 via-violet-500 to-purple-400",
    glowColor: "rgba(168, 85, 247, 0.6)",
    position: { x: 25, y: 70 },
    description: "Révélez l'invisible"
  },
  Logic: { 
    name: "Labyrinthe Mental", 
    icon: Terminal,
    gradient: "from-red-600 via-rose-500 to-red-400",
    glowColor: "rgba(239, 68, 68, 0.6)",
    position: { x: 50, y: 75 },
    description: "Résolvez les énigmes"
  },
  Forensics: { 
    name: "Archives Secrètes", 
    icon: FileSearch,
    gradient: "from-indigo-600 via-blue-500 to-indigo-400",
    glowColor: "rgba(99, 102, 241, 0.6)",
    position: { x: 80, y: 65 },
    description: "Analysez les preuves"
  },
};

const getSessionId = () => sessionStorage.getItem('ctf_session_id');

const MapArena = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChallenges();
  }, [user]);

  const fetchChallenges = async () => {
    setIsLoading(true);
    try {
      const { data: challengesData, error: challengesError } = await supabase
        .from("challenges_public")
        .select("id, title, category, points, description, hint, file_url, difficulty, is_terminal_challenge, external_url")
        .eq("is_active", true)
        .order("points", { ascending: true }) as { data: any[] | null; error: any };

      if (challengesError) throw challengesError;

      let userSolvedIds = new Set<string>();
      if (user) {
        const { data: submissions } = await supabase
          .from("submissions_public")
          .select("challenge_id")
          .eq("user_id", user.id)
          .eq("is_correct", true) as { data: any[] | null; error: any };

        if (submissions) {
          userSolvedIds = new Set(submissions.map((s) => s.challenge_id));
        }
      } else {
        const currentSessionId = getSessionId();
        if (currentSessionId) {
          const { data: player } = await supabase
            .from("players")
            .select("id")
            .eq("session_id", currentSessionId)
            .maybeSingle();

          if (player) {
            const { data: submissions } = await supabase
              .from("submissions_public")
              .select("challenge_id")
              .eq("player_id", player.id)
              .eq("is_correct", true) as { data: any[] | null; error: any };

            if (submissions) {
              userSolvedIds = new Set(submissions.map((s) => s.challenge_id));
            }
          }
        }
      }

      setSolvedIds(userSolvedIds);

      const formattedChallenges: Challenge[] = (challengesData || []).map((c) => ({
        ...c,
        category: c.category as Challenge["category"],
        solved: userSolvedIds.has(c.id),
        difficulty: c.difficulty || 1,
        isTerminalChallenge: c.is_terminal_challenge || false,
        externalUrl: c.external_url || null,
      }));

      setChallenges(formattedChallenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSolve = (challengeId: string) => {
    setSolvedIds((prev) => new Set([...prev, challengeId]));
    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, solved: true } : c))
    );
  };

  const getChallengesByCategory = (category: string) => 
    challenges.filter(c => c.category === category);

  const getZoneProgress = (category: string) => {
    const zoneChallenges = getChallengesByCategory(category);
    const solved = zoneChallenges.filter(c => c.solved).length;
    return { solved, total: zoneChallenges.length };
  };

  const totalPoints = challenges.reduce((acc, c) => acc + c.points, 0);
  const earnedPoints = challenges.filter((c) => c.solved).reduce((acc, c) => acc + c.points, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />

      <main className="container px-4 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-mono text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <Flame className="h-8 w-8 text-primary animate-pulse" />
              <span className="text-primary glow-text">Cyber</span> Donjon
            </h1>
            <p className="text-muted-foreground">
              Explore les zones et conquiers chaque défi
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/arena")}
              className="gap-2"
            >
              <Grid className="h-4 w-4" />
              Vue Grille
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-6 mb-6 p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-mono text-lg">
              <span className="text-primary font-bold">{earnedPoints}</span>
              <span className="text-muted-foreground">/{totalPoints} pts</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Terminal className="h-5 w-5 text-primary" />
            <span className="font-mono text-lg">
              <span className="font-bold">{challenges.filter(c => c.solved).length}</span>
              <span className="text-muted-foreground">/{challenges.length} défis</span>
            </span>
          </div>
        </div>

        {/* Dungeon Map */}
        <div 
          ref={mapRef}
          className="relative w-full aspect-[16/9] rounded-2xl border-2 border-border overflow-hidden"
          style={{
            background: `
              radial-gradient(ellipse at 30% 20%, hsl(var(--primary) / 0.1) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 80%, hsl(280 100% 70% / 0.08) 0%, transparent 50%),
              linear-gradient(180deg, hsl(222 47% 8%) 0%, hsl(222 47% 4%) 100%)
            `
          }}
        >
          {/* Dungeon floor texture */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 40px,
                  hsl(var(--border) / 0.5) 40px,
                  hsl(var(--border) / 0.5) 41px
                ),
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 40px,
                  hsl(var(--border) / 0.5) 40px,
                  hsl(var(--border) / 0.5) 41px
                )
              `
            }}
          />

          {/* Fog overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse at 50% 50%, transparent 30%, hsl(222 47% 4% / 0.6) 100%)
              `
            }}
          />

          {/* Animated particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-primary/40"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          {/* Connection paths between zones */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Central hub */}
            <circle cx="50%" cy="45%" r="8" fill="hsl(var(--primary))" filter="url(#glow)" opacity="0.8" />
            
            {/* Paths to each zone */}
            {Object.entries(zoneConfig).map(([category, config]) => (
              <g key={category}>
                <path
                  d={`M 50% 45% Q ${(50 + config.position.x) / 2}% ${(45 + config.position.y) / 2 + 10}% ${config.position.x}% ${config.position.y}%`}
                  stroke="url(#pathGradient)"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="8 4"
                  className="animate-pulse"
                  style={{ animationDuration: '3s' }}
                />
              </g>
            ))}
          </svg>

          {/* Zone nodes */}
          {Object.entries(zoneConfig).map(([category, config]) => {
            const progress = getZoneProgress(category);
            const isHovered = hoveredZone === category;
            const isSelected = selectedZone === category;
            const isCompleted = progress.solved === progress.total && progress.total > 0;
            const Icon = config.icon;

            return (
              <button
                key={category}
                onClick={() => setSelectedZone(isSelected ? null : category)}
                onMouseEnter={() => setHoveredZone(category)}
                onMouseLeave={() => setHoveredZone(null)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 group"
                style={{ 
                  left: `${config.position.x}%`, 
                  top: `${config.position.y}%`,
                  zIndex: isHovered || isSelected ? 30 : 10,
                }}
              >
                {/* Outer glow ring */}
                <div
                  className={`
                    absolute inset-0 rounded-2xl transition-all duration-500
                    ${isCompleted ? 'animate-pulse' : ''}
                  `}
                  style={{
                    background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
                    transform: isHovered || isSelected ? 'scale(3)' : 'scale(2)',
                    opacity: isHovered || isSelected ? 0.8 : 0.3,
                  }}
                />

                {/* Zone card */}
                <div
                  className={`
                    relative w-24 h-24 md:w-32 md:h-32 rounded-2xl
                    border-2 transition-all duration-300
                    flex flex-col items-center justify-center gap-2
                    backdrop-blur-sm
                    ${isSelected 
                      ? 'border-primary shadow-2xl scale-110' 
                      : isHovered 
                        ? 'border-primary/50 shadow-xl scale-105' 
                        : 'border-border/50 shadow-lg'
                    }
                  `}
                  style={{
                    background: isCompleted 
                      ? `linear-gradient(135deg, ${config.glowColor.replace('0.6', '0.3')}, hsl(222 47% 8% / 0.9))`
                      : 'hsl(222 47% 8% / 0.9)',
                  }}
                >
                  {/* Icon */}
                  <div className={`
                    p-2 rounded-xl transition-all duration-300
                    ${isCompleted ? `bg-gradient-to-br ${config.gradient}` : 'bg-muted/50'}
                  `}>
                    <Icon className={`
                      h-6 w-6 md:h-8 md:w-8 transition-all duration-300
                      ${isCompleted ? 'text-white' : 'text-muted-foreground'}
                      ${isHovered ? 'scale-110' : ''}
                    `} />
                  </div>

                  {/* Zone name */}
                  <span className={`
                    font-mono text-xs md:text-sm font-bold text-center px-2 leading-tight
                    ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}
                  `}>
                    {config.name}
                  </span>

                  {/* Progress indicator */}
                  <div className="flex items-center gap-1">
                    <div className="w-12 md:w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${config.gradient}`}
                        style={{ width: progress.total > 0 ? `${(progress.solved / progress.total) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {progress.solved}/{progress.total}
                    </span>
                  </div>

                  {/* Completion badge */}
                  {isCompleted && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Unlock className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {/* Center info */}
          <div className="absolute left-1/2 top-[45%] transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="font-mono text-xs text-muted-foreground/60">NEXUS</div>
          </div>
        </div>

        {/* Selected zone challenges */}
        {selectedZone && (
          <div className="mt-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              {(() => {
                const config = zoneConfig[selectedZone];
                const Icon = config.icon;
                return (
                  <>
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${config.gradient}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-mono text-xl font-bold">{config.name}</h2>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getChallengesByCategory(selectedZone).map((challenge) => (
                <button
                  key={challenge.id}
                  onClick={() => {
                    setSelectedChallenge(challenge);
                    setIsModalOpen(true);
                  }}
                  className={`
                    p-4 rounded-xl border-2 text-left transition-all duration-300
                    hover:scale-[1.02] hover:shadow-lg
                    ${challenge.solved 
                      ? 'border-primary/50 bg-primary/10' 
                      : 'border-border bg-card hover:border-primary/30'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-mono font-bold text-sm">{challenge.title}</h3>
                    {challenge.solved ? (
                      <Unlock className="h-4 w-4 text-primary" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-primary font-bold">
                      {challenge.points} pts
                    </span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: challenge.difficulty }).map((_, i) => (
                        <Skull 
                          key={i} 
                          className={`h-3 w-3 ${challenge.solved ? 'text-primary/60' : 'text-muted-foreground/60'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Instructions when no zone selected */}
        {!selectedZone && (
          <div className="mt-6 text-center text-muted-foreground">
            <p className="font-mono text-sm">Clique sur une zone pour voir ses défis</p>
          </div>
        )}
      </main>

      <ChallengeModal
        challenge={selectedChallenge}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSolve={handleSolve}
      />

      <TrollOverlay />

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
};

export default MapArena;
