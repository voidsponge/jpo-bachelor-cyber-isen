import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Terminal, Loader2, Map, Grid, Lock, Unlock, Skull } from "lucide-react";
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

interface MapNode {
  challenge: Challenge;
  x: number;
  y: number;
  connections: string[];
}

const categoryColors: Record<string, string> = {
  Web: "from-blue-500 to-cyan-500",
  OSINT: "from-green-500 to-emerald-500",
  Crypto: "from-yellow-500 to-orange-500",
  Stegano: "from-purple-500 to-pink-500",
  Logic: "from-red-500 to-rose-500",
  Forensics: "from-indigo-500 to-violet-500",
};

const categoryGlow: Record<string, string> = {
  Web: "shadow-blue-500/50",
  OSINT: "shadow-green-500/50",
  Crypto: "shadow-yellow-500/50",
  Stegano: "shadow-purple-500/50",
  Logic: "shadow-red-500/50",
  Forensics: "shadow-indigo-500/50",
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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

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

  // Generate map positions for challenges
  const generateMapNodes = (): MapNode[] => {
    const nodes: MapNode[] = [];
    const categories = [...new Set(challenges.map(c => c.category))];
    
    // Position challenges in a circular/hex pattern by category
    const centerX = 50;
    const centerY = 50;
    const radius = 35;

    categories.forEach((category, catIndex) => {
      const categoryChallenges = challenges.filter(c => c.category === category);
      const angleOffset = (catIndex / categories.length) * Math.PI * 2;
      
      categoryChallenges.forEach((challenge, i) => {
        const angle = angleOffset + (i * 0.3);
        const r = radius - (i * 5);
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        // Connect to previous challenge in same category
        const connections: string[] = [];
        if (i > 0) {
          connections.push(categoryChallenges[i - 1].id);
        }
        
        nodes.push({ challenge, x, y, connections });
      });
    });

    return nodes;
  };

  const mapNodes = generateMapNodes();

  const handleNodeClick = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setIsModalOpen(true);
  };

  const handleSolve = (challengeId: string) => {
    setSolvedIds((prev) => new Set([...prev, challengeId]));
    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, solved: true } : c))
    );
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
            <h1 className="font-mono text-3xl md:text-4xl font-bold mb-2">
              <span className="text-primary">Cyber</span> Donjon
            </h1>
            <p className="text-muted-foreground">
              Explore la carte et conquiers chaque zone
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

        {/* Stats */}
        <div className="flex gap-6 mb-6 p-4 rounded-xl border border-border bg-card/50">
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
              <span className="text-muted-foreground">/{challenges.length} zones</span>
            </span>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative w-full aspect-[16/10] rounded-2xl border border-border bg-gradient-to-br from-background via-card/50 to-background overflow-hidden">
          {/* Grid background */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />

          {/* Animated scan line */}
          <div 
            className="absolute w-full h-[2px] bg-primary/20 pointer-events-none"
            style={{
              animation: "scan-line 8s linear infinite",
              boxShadow: "0 0 30px 10px hsl(var(--primary) / 0.1)",
            }}
          />

          {/* SVG for connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {mapNodes.map((node) =>
              node.connections.map((targetId) => {
                const targetNode = mapNodes.find((n) => n.challenge.id === targetId);
                if (!targetNode) return null;
                
                const isActive = node.challenge.solved || targetNode.challenge.solved;
                
                return (
                  <line
                    key={`${node.challenge.id}-${targetId}`}
                    x1={`${node.x}%`}
                    y1={`${node.y}%`}
                    x2={`${targetNode.x}%`}
                    y2={`${targetNode.y}%`}
                    stroke={isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                    strokeWidth={isActive ? "3" : "1"}
                    strokeOpacity={isActive ? 0.8 : 0.3}
                    strokeDasharray={isActive ? "none" : "5,5"}
                    className="transition-all duration-500"
                  />
                );
              })
            )}
          </svg>

          {/* Challenge Nodes */}
          {mapNodes.map((node) => {
            const { challenge, x, y } = node;
            const isHovered = hoveredNode === challenge.id;
            
            return (
              <button
                key={challenge.id}
                onClick={() => handleNodeClick(challenge)}
                onMouseEnter={() => setHoveredNode(challenge.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className={`
                  absolute transform -translate-x-1/2 -translate-y-1/2
                  transition-all duration-300 ease-out
                  ${isHovered ? 'scale-125 z-20' : 'scale-100 z-10'}
                `}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {/* Outer glow */}
                <div
                  className={`
                    absolute inset-0 rounded-xl blur-xl transition-opacity duration-300
                    bg-gradient-to-br ${categoryColors[challenge.category]}
                    ${challenge.solved ? 'opacity-60' : 'opacity-0'}
                    ${isHovered ? 'opacity-80' : ''}
                  `}
                  style={{ transform: 'scale(1.5)' }}
                />

                {/* Node body */}
                <div
                  className={`
                    relative w-16 h-16 md:w-20 md:h-20 rounded-xl
                    border-2 transition-all duration-300
                    flex flex-col items-center justify-center gap-1
                    ${challenge.solved 
                      ? `bg-gradient-to-br ${categoryColors[challenge.category]} border-transparent shadow-lg ${categoryGlow[challenge.category]}` 
                      : 'bg-card border-border hover:border-primary/50'
                    }
                    ${isHovered ? 'shadow-2xl' : 'shadow-md'}
                  `}
                >
                  {/* Icon */}
                  {challenge.solved ? (
                    <Unlock className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  ) : (
                    <Lock className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                  )}
                  
                  {/* Points */}
                  <span className={`
                    font-mono text-xs font-bold
                    ${challenge.solved ? 'text-white' : 'text-muted-foreground'}
                  `}>
                    {challenge.points}pts
                  </span>

                  {/* Difficulty skulls */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: challenge.difficulty }).map((_, i) => (
                      <Skull 
                        key={i} 
                        className={`h-2.5 w-2.5 ${challenge.solved ? 'text-white/80' : 'text-muted-foreground/60'}`} 
                      />
                    ))}
                  </div>
                </div>

                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                      <p className="font-mono font-bold text-sm">{challenge.title}</p>
                      <p className="text-xs text-muted-foreground">{challenge.category}</p>
                    </div>
                  </div>
                )}
              </button>
            );
          })}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-background/80 backdrop-blur-sm border border-border">
            <p className="text-xs font-mono text-muted-foreground mb-2">Légende</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryColors).map(([cat, color]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded bg-gradient-to-br ${color}`} />
                  <span className="text-xs">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <ChallengeModal
        challenge={selectedChallenge}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSolve={handleSolve}
      />

      <TrollOverlay />
    </div>
  );
};

export default MapArena;
