import { useState, useEffect, useRef } from "react";
import { Trophy, Target, Clock, Zap, Bell, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import MatrixRain from "@/components/MatrixRain";

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  solvedCount: number;
  lastSolve: string | null;
  isAnonymous: boolean;
}

interface Notification {
  id: string;
  username: string;
  challengeTitle: string;
  points: number;
  timestamp: Date;
}

const Spectator = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQNUaX6lqKSNblxQZ5C2vqmbcFFBYojQ17yfdl1IT3vC1+zJj1swNlx8qsjJtYBfRkRpns7e0qx6Sk5ghLjQ0q+HW0JGXY6ww7mllXpmZGVwoLO7rp+GcGllbXqGjY2GfXNxa3J6gIOCfHh1c3R4e3t7enh3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3");
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to realtime submissions
    const channel = supabase
      .channel("spectator-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "submissions",
          filter: "is_correct=eq.true"
        },
        async (payload) => {
          // Play sound
          if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
          
          // Fetch details for notification
          const submission = payload.new as any;
          await addNotification(submission);
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  const addNotification = async (submission: any) => {
    try {
      // Get challenge info
      const { data: challenge } = await supabase
        .from("challenges")
        .select("title, points")
        .eq("id", submission.challenge_id)
        .single();

      // Get username
      let username = "Anonyme";
      if (submission.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", submission.user_id)
          .single();
        username = profile?.username || "Inconnu";
      } else if (submission.player_id) {
        const { data: player } = await supabase
          .from("players")
          .select("pseudo")
          .eq("id", submission.player_id)
          .single();
        username = player?.pseudo || "Anonyme";
      }

      const notification: Notification = {
        id: submission.id,
        username,
        challengeTitle: challenge?.title || "Challenge",
        points: challenge?.points || 0,
        timestamp: new Date(),
      };

      setNotifications(prev => [notification, ...prev].slice(0, 5));
    } catch (error) {
      console.error("Error fetching notification details:", error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data: submissions } = await supabase
        .from("submissions")
        .select("user_id, player_id, submitted_at, challenge_id")
        .eq("is_correct", true)
        .order("submitted_at", { ascending: true });

      const { data: challenges } = await supabase
        .from("challenges")
        .select("id, points");

      const challengePoints = new Map(challenges?.map(c => [c.id, c.points]) || []);

      const userIds = [...new Set(submissions?.filter(s => s.user_id).map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

      const userProfiles = new Map(profiles?.map(p => [p.user_id, p.username]) || []);

      const playerIds = [...new Set(submissions?.filter(s => s.player_id).map(s => s.player_id) || [])];
      const { data: players } = await supabase
        .from("players")
        .select("id, pseudo")
        .in("id", playerIds.length > 0 ? playerIds : ['00000000-0000-0000-0000-000000000000']);

      const playerPseudos = new Map(players?.map(p => [p.id, p.pseudo]) || []);

      const stats = new Map<string, {
        username: string;
        score: number;
        solvedCount: number;
        lastSolve: string;
        isAnonymous: boolean;
      }>();

      submissions?.forEach((sub) => {
        const key = sub.user_id || sub.player_id;
        if (!key) return;

        const isAnonymous = !sub.user_id;
        const username = isAnonymous 
          ? (playerPseudos.get(sub.player_id!) || "Anonyme")
          : (userProfiles.get(sub.user_id!) || "Inconnu");
        
        const points = challengePoints.get(sub.challenge_id) || 0;
        const existing = stats.get(key);
        
        if (existing) {
          existing.score += points;
          existing.solvedCount += 1;
          if (sub.submitted_at > existing.lastSolve) {
            existing.lastSolve = sub.submitted_at;
          }
        } else {
          stats.set(key, { username, score: points, solvedCount: 1, lastSolve: sub.submitted_at, isAnonymous });
        }
      });

      const leaderboardData: LeaderboardEntry[] = Array.from(stats.values())
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return new Date(a.lastSolve).getTime() - new Date(b.lastSolve).getTime();
        })
        .map((entry, index) => ({ rank: index + 1, ...entry }));

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return "text-yellow-400 bg-yellow-400/20 border-yellow-400/50";
      case 2: return "text-slate-300 bg-slate-300/20 border-slate-300/50";
      case 3: return "text-amber-600 bg-amber-600/20 border-amber-600/50";
      default: return "text-muted-foreground bg-muted/50 border-border";
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-background relative overflow-hidden">
      {/* Matrix background */}
      <div className="absolute inset-0 opacity-20">
        <MatrixRain speed={0.3} />
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="bg-background/80 backdrop-blur-sm"
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleFullscreen}
          className="bg-background/80 backdrop-blur-sm"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main content */}
      <div className="relative z-10 container px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-mono text-4xl md:text-6xl font-bold mb-2">
            <span className="text-primary glow-text">ISEN</span> CyberCTF
          </h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-lg">LIVE</span>
          </div>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-8 space-y-2">
            {notifications.map((notif, i) => (
              <div
                key={notif.id}
                className="flex items-center justify-center gap-3 p-3 rounded-lg bg-primary/20 border border-primary/30 animate-fade-in font-mono"
                style={{ animationDelay: `${i * 0.1}s`, opacity: 1 - i * 0.15 }}
              >
                <Bell className="h-5 w-5 text-primary" />
                <span className="text-primary font-bold">{notif.username}</span>
                <span className="text-foreground">a résolu</span>
                <span className="text-foreground font-bold">{notif.challengeTitle}</span>
                <Badge className="bg-primary/30 text-primary">+{notif.points} pts</Badge>
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Podium */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-6 w-6 text-primary" />
              <h2 className="font-mono text-2xl font-bold">Top 3</h2>
            </div>
            
            <div className="space-y-4">
              {leaderboard.slice(0, 3).map((player, index) => (
                <div
                  key={`${player.username}-${index}`}
                  className={`p-6 rounded-xl border ${getRankStyle(player.rank)} backdrop-blur-sm transition-all animate-fade-in`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{getRankIcon(player.rank)}</div>
                    <div className="flex-1">
                      <h3 className="font-mono text-xl font-bold">{player.username}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {player.solvedCount}
                        </span>
                      </div>
                    </div>
                    <div className="font-mono text-3xl font-bold text-primary glow-text">
                      {player.score}
                    </div>
                  </div>
                </div>
              ))}
              
              {leaderboard.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>En attente des participants...</p>
                </div>
              )}
            </div>
          </div>

          {/* Full leaderboard */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-6 w-6 text-primary" />
              <h2 className="font-mono text-2xl font-bold">Classement complet</h2>
            </div>

            <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-mono text-primary w-20">Rang</TableHead>
                    <TableHead className="font-mono text-primary">Joueur</TableHead>
                    <TableHead className="font-mono text-primary text-center">Score</TableHead>
                    <TableHead className="font-mono text-primary text-center">Résolus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.slice(0, 15).map((player) => (
                    <TableRow
                      key={`${player.username}-${player.rank}`}
                      className={`border-border transition-colors ${player.rank <= 3 ? "bg-primary/5" : ""}`}
                    >
                      <TableCell>
                        <Badge variant="outline" className={`font-mono ${getRankStyle(player.rank)}`}>
                          {getRankIcon(player.rank)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-medium text-lg">{player.username}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono font-bold text-primary text-xl">{player.score}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-muted-foreground">{player.solvedCount}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono">Mise à jour en temps réel</span>
          </div>
          <span>•</span>
          <span className="font-mono">{leaderboard.length} participants</span>
        </div>
      </div>
    </div>
  );
};

export default Spectator;