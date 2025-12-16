import { useState } from "react";
import { Trophy, Terminal, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import ChallengeCard, { Challenge } from "@/components/ChallengeCard";
import ChallengeModal from "@/components/ChallengeModal";
import { challenges as initialChallenges } from "@/data/challenges";

const Arena = () => {
  const [challenges, setChallenges] = useState<Challenge[]>(initialChallenges);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalPoints = challenges.reduce((acc, c) => acc + c.points, 0);
  const earnedPoints = challenges.filter((c) => c.solved).reduce((acc, c) => acc + c.points, 0);
  const solvedCount = challenges.filter((c) => c.solved).length;

  const handleChallengeClick = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setIsModalOpen(true);
  };

  const handleSolve = (challengeId: string) => {
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { ...c, solved: true, firstBlood: c.firstBlood || "Toi !" }
          : c
      )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-4 pt-24 pb-12">
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
                {Math.round((earnedPoints / totalPoints) * 100)}%
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
              style={{ width: `${(earnedPoints / totalPoints) * 100}%` }}
            />
          </div>
        </div>

        {/* Challenges Grid */}
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
      </main>

      <ChallengeModal
        challenge={selectedChallenge}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSolve={handleSolve}
      />
    </div>
  );
};

export default Arena;
