import { useState, useEffect } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import ChallengeModal from "@/components/ChallengeModal";
import TrollOverlay from "@/components/TrollOverlay";
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

// Category-based gradient backgrounds for the cards
const categoryGradients = {
  Web: "from-blue-600 via-blue-800 to-slate-900",
  OSINT: "from-amber-500 via-orange-700 to-slate-900",
  Crypto: "from-purple-600 via-violet-800 to-slate-900",
  Stegano: "from-pink-500 via-rose-700 to-slate-900",
  Logic: "from-orange-500 via-red-700 to-slate-900",
  Forensics: "from-cyan-500 via-teal-700 to-slate-900",
};

// Category icons as SVG patterns
const categoryPatterns = {
  Web: "🌐",
  OSINT: "🔍",
  Crypto: "🔐",
  Stegano: "🖼️",
  Logic: "⚙️",
  Forensics: "🔬",
};

const ChampionCard = ({ 
  challenge, 
  onClick 
}: { 
  challenge: Challenge; 
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer overflow-hidden rounded-lg transition-all duration-300 hover:scale-105 hover:z-10 ${
        challenge.solved ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      }`}
    >
      {/* Card Image Area */}
      <div className={`aspect-[3/4] bg-gradient-to-b ${categoryGradients[challenge.category]} relative overflow-hidden`}>
        {/* Category Icon Pattern */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 text-8xl">
          {categoryPatterns[challenge.category]}
        </div>
        
        {/* Animated glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Points badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono font-bold text-primary">
          {challenge.points} pts
        </div>
        
        {/* Difficulty skulls */}
        <div className="absolute top-2 left-2 flex gap-0.5">
          {Array.from({ length: 3 }, (_, i) => (
            <span
              key={i}
              className={`text-xs ${i < challenge.difficulty ? "text-red-500" : "text-muted-foreground/30"}`}
            >
              💀
            </span>
          ))}
        </div>

        {/* Solved indicator */}
        {challenge.solved && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
            <CheckCircle2 className="h-16 w-16 text-primary drop-shadow-lg" />
          </div>
        )}

        {/* Hover overlay with description */}
        <div className="absolute inset-x-0 bottom-12 top-1/2 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <p className="text-xs text-foreground/80 line-clamp-3">
            {challenge.description}
          </p>
        </div>
      </div>

      {/* Title Bar */}
      <div className="bg-slate-800/95 backdrop-blur-sm px-3 py-2.5 border-t border-slate-700">
        <h3 className="font-mono font-bold text-sm text-foreground uppercase tracking-wide truncate">
          {challenge.title}
        </h3>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
          {challenge.category}
        </span>
      </div>
    </div>
  );
};

const Arena = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("all");

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
        const { data: submissions, error: submissionsError } = await supabase
          .from("submissions_public")
          .select("challenge_id")
          .eq("user_id", user.id)
          .eq("is_correct", true) as { data: any[] | null; error: any };

        if (!submissionsError && submissions) {
          userSolvedIds = new Set(submissions.map((s) => s.challenge_id));
        }
      } else {
        const currentSessionId = sessionStorage.getItem('ctf_session_id');
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

  const handleChallengeClick = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setIsModalOpen(true);
  };

  const handleSolve = (challengeId: string) => {
    setSolvedIds((prev) => new Set([...prev, challengeId]));
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId ? { ...c, solved: true } : c
      )
    );
  };

  const categories = ["all", "Web", "OSINT", "Crypto", "Stegano", "Logic", "Forensics"];
  const filteredChallenges = filter === "all" 
    ? challenges 
    : challenges.filter(c => c.category === filter);

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
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-4 pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-mono text-3xl md:text-4xl font-bold mb-2">
            <span className="text-primary glow-text">SÉLECTION</span> DES CHALLENGES
          </h1>
          <p className="text-muted-foreground">
            Choisissez votre prochain défi. Maîtrisez-en un, ou maîtrisez-les tous.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg font-mono text-sm uppercase tracking-wide transition-all duration-200 ${
                filter === cat
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {cat === "all" ? "Tous" : cat}
            </button>
          ))}
        </div>

        {/* Champion Grid */}
        {filteredChallenges.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun challenge disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredChallenges.map((challenge, index) => (
              <div
                key={challenge.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <ChampionCard
                  challenge={challenge}
                  onClick={() => handleChallengeClick(challenge)}
                />
              </div>
            ))}
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
    </div>
  );
};

export default Arena;
