import { useState, useEffect } from "react";
import { Trophy, Clock, Target, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  solvedCount: number;
  lastSolve: string | null;
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("leaderboard-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "submissions",
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Get all correct submissions with user info
      const { data: submissions, error } = await supabase
        .from("submissions")
        .select(`
          user_id,
          submitted_at,
          challenges!inner(points),
          profiles!inner(username)
        `)
        .eq("is_correct", true)
        .order("submitted_at", { ascending: true });

      if (error) throw error;

      // Aggregate by user
      const userStats = new Map<string, {
        username: string;
        score: number;
        solvedCount: number;
        lastSolve: string;
      }>();

      submissions?.forEach((sub: any) => {
        const userId = sub.user_id;
        const existing = userStats.get(userId);
        
        if (existing) {
          existing.score += sub.challenges.points;
          existing.solvedCount += 1;
          if (sub.submitted_at > existing.lastSolve) {
            existing.lastSolve = sub.submitted_at;
          }
        } else {
          userStats.set(userId, {
            username: sub.profiles.username,
            score: sub.challenges.points,
            solvedCount: 1,
            lastSolve: sub.submitted_at,
          });
        }
      });

      // Convert to array and sort
      const leaderboardData: LeaderboardEntry[] = Array.from(userStats.values())
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          // If same score, earlier last solve wins
          return new Date(a.lastSolve).getTime() - new Date(b.lastSolve).getTime();
        })
        .map((entry, index) => ({
          rank: index + 1,
          ...entry,
        }));

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
      case 2:
        return "text-slate-300 bg-slate-300/10 border-slate-300/30";
      case 3:
        return "text-amber-600 bg-amber-600/10 border-amber-600/30";
      default:
        return "text-muted-foreground bg-muted/50 border-border";
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return date.toLocaleDateString("fr-FR");
  };

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
        <div className="mb-8">
          <h1 className="font-mono text-3xl md:text-4xl font-bold mb-2">
            <span className="text-primary">Leader</span>board
          </h1>
          <p className="text-muted-foreground">
            Classement en temps réel des participants
          </p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun participant pour le moment</p>
            <p className="text-sm">Sois le premier à résoudre un challenge !</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="grid md:grid-cols-3 gap-4 mb-12">
              {leaderboard.slice(0, 3).map((player, index) => {
                const order = index === 0 ? "md:order-2" : index === 1 ? "md:order-1" : "md:order-3";
                const height = index === 0 ? "md:pb-8" : index === 1 ? "md:pb-4" : "";
                
                return (
                  <div
                    key={player.username}
                    className={`${order} ${height} animate-fade-in`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`p-6 rounded-xl border ${getRankStyle(player.rank)} backdrop-blur-sm text-center transition-all hover-glow`}>
                      <div className="text-4xl mb-3">{getRankIcon(player.rank)}</div>
                      <h3 className="font-mono text-xl font-bold mb-1">{player.username}</h3>
                      <div className="font-mono text-3xl font-bold text-primary glow-text mb-2">
                        {player.score}
                        <span className="text-sm text-muted-foreground ml-1">pts</span>
                      </div>
                      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {player.solvedCount} résolus
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full Leaderboard Table */}
            <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-mono text-primary w-20">Rang</TableHead>
                    <TableHead className="font-mono text-primary">Joueur</TableHead>
                    <TableHead className="font-mono text-primary text-center">Score</TableHead>
                    <TableHead className="font-mono text-primary text-center hidden md:table-cell">Résolus</TableHead>
                    <TableHead className="font-mono text-primary text-right hidden sm:table-cell">Dernier flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((player) => (
                    <TableRow
                      key={player.username}
                      className={`border-border transition-colors ${
                        player.rank <= 3 ? "bg-primary/5" : ""
                      }`}
                    >
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-mono ${getRankStyle(player.rank)}`}
                        >
                          {getRankIcon(player.rank)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {player.username}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono font-bold text-primary">
                          {player.score}
                        </span>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <span className="font-mono text-muted-foreground">
                          {player.solvedCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <span className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(player.lastSolve)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Live indicator */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="font-mono">Mise à jour en temps réel</span>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
