import { useState, useEffect } from "react";
import { Trophy, Terminal, Zap, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import ChallengeCard from "@/components/ChallengeCard";
import ChallengeModal from "@/components/ChallengeModal";
import TrollOverlay from "@/components/TrollOverlay";
import CircuitBackground from "@/components/CircuitBackground";
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

// Get session ID for anonymous players
const getSessionId = () => {
  return sessionStorage.getItem('ctf_session_id');
};

const Arena = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [playerId, setPlayerId] = useState<string | undefined>();

  useEffect(() => {
    fetchChallenges();
  }, [user]);

  const fetchChallenges = async () => {
    setIsLoading(true);
    try {
      // Fetch active challenges from the public view (excludes flag column)
      const { data: challengesData, error: challengesError } = await supabase
        .from("challenges_public")
        .select("id, title, category, points, description, hint, file_url, difficulty, is_terminal_challenge, external_url")
        .eq("is_active", true)
        .order("points", { ascending: true }) as { data: any[] | null; error: any };

      if (challengesError) throw challengesError;

      // Fetch solved challenges for authenticated users from public view
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
        // Check for anonymous player's solved challenges
        const currentSessionId = sessionStorage.getItem('ctf_session_id');
        if (currentSessionId) {
          // First get player_id from session
          const { data: player } = await supabase
            .from("players")
            .select("id")
            .eq("session_id", currentSessionId)
            .maybeSingle();

          if (player) {
            setPlayerId(player.id);
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

  const totalPoints = challenges.reduce((acc, c) => acc + c.points, 0);
  const earnedPoints = challenges.filter((c) => c.solved).reduce((acc, c) => acc + c.points, 0);
  const solvedCount = challenges.filter((c) => c.solved).length;

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background relative">
        <CircuitBackground />
        <Navbar />
        <div className="flex items-center justify-center pt-32 relative z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <CircuitBackground />
      <Navbar />

      <main className="container px-4 pt-24 pb-12 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-mono text-3xl md:text-4xl font-bold mb-2">
            <span className="text-primary">CTF</span> Arena
          </h1>
          <p className="text-muted-foreground">
            Résous les challenges pour gagner des points et grimper au classement
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl border border-border bg-card/50 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-primary glow-text">
                {earnedPoints}
                <span className="text-sm text-muted-foreground font-normal">
                  /{totalPoints}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">Points</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card/50 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Terminal className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-foreground">
                {solvedCount}
                <span className="text-sm text-muted-foreground font-normal">
                  /{challenges.length}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">Résolus</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card/50 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-foreground">
                {totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Progression</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Challenges Grid */}
        {challenges.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun challenge disponible pour le moment</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((challenge, index) => (
              <div
                key={challenge.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <ChallengeCard
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