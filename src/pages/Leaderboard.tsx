import { Trophy, Medal, Clock, Target } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { leaderboardData } from "@/data/challenges";

const Leaderboard = () => {
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

        {/* Top 3 Podium */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {leaderboardData.slice(0, 3).map((player, index) => {
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
              {leaderboardData.map((player, index) => (
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
                      {player.solvedCount}/6
                    </span>
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    <span className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {player.lastSolve}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

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
