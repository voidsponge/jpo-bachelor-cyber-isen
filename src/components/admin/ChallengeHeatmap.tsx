import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, CheckCircle, XCircle, TrendingDown } from "lucide-react";

interface ChallengeStats {
  id: string;
  title: string;
  category: string;
  points: number;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  uniquePlayers: number;
}

const ChallengeHeatmap = () => {
  const [stats, setStats] = useState<ChallengeStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get all challenges
      const { data: challenges } = await supabase
        .from("challenges")
        .select("id, title, category, points")
        .order("points", { ascending: true });

      // Get all submissions
      const { data: submissions } = await supabase
        .from("submissions")
        .select("challenge_id, is_correct, user_id, player_id");

      if (!challenges || !submissions) return;

      const challengeStats: ChallengeStats[] = challenges.map(challenge => {
        const challengeSubmissions = submissions.filter(s => s.challenge_id === challenge.id);
        const successful = challengeSubmissions.filter(s => s.is_correct).length;
        const failed = challengeSubmissions.filter(s => !s.is_correct).length;
        const total = challengeSubmissions.length;
        
        // Count unique players/users
        const uniqueIds = new Set(challengeSubmissions.map(s => s.user_id || s.player_id));
        
        return {
          id: challenge.id,
          title: challenge.title,
          category: challenge.category,
          points: challenge.points,
          totalAttempts: total,
          successfulAttempts: successful,
          failedAttempts: failed,
          successRate: total > 0 ? (successful / total) * 100 : 0,
          uniquePlayers: uniqueIds.size,
        };
      });

      // Sort by failure rate (most difficult first)
      challengeStats.sort((a, b) => a.successRate - b.successRate);
      setStats(challengeStats);
    } catch (error) {
      console.error("Error fetching heatmap stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHeatColor = (successRate: number): string => {
    if (successRate === 0) return "bg-slate-700";
    if (successRate < 20) return "bg-red-600";
    if (successRate < 40) return "bg-orange-500";
    if (successRate < 60) return "bg-yellow-500";
    if (successRate < 80) return "bg-lime-500";
    return "bg-green-500";
  };

  const getDifficultyLabel = (successRate: number): string => {
    if (successRate === 0) return "Pas de données";
    if (successRate < 20) return "🔥 Très difficile";
    if (successRate < 40) return "💀 Difficile";
    if (successRate < 60) return "⚡ Moyen";
    if (successRate < 80) return "✅ Facile";
    return "🎯 Très facile";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-lg flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Légende - Taux de réussite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-red-600" />
              <span className="text-sm">&lt; 20%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-orange-500" />
              <span className="text-sm">20-40%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-yellow-500" />
              <span className="text-sm">40-60%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-lime-500" />
              <span className="text-sm">60-80%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500" />
              <span className="text-sm">&gt; 80%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((challenge) => (
          <Card 
            key={challenge.id} 
            className={`relative overflow-hidden transition-all hover:scale-[1.02] ${
              challenge.totalAttempts === 0 ? 'opacity-60' : ''
            }`}
          >
            {/* Heat indicator bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${getHeatColor(challenge.successRate)}`} />
            
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-mono font-bold text-foreground truncate">
                    {challenge.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {challenge.category}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {challenge.points} pts
                    </Badge>
                  </div>
                </div>
                <div 
                  className={`w-12 h-12 rounded-lg ${getHeatColor(challenge.successRate)} flex items-center justify-center text-white font-mono font-bold text-sm`}
                >
                  {challenge.successRate.toFixed(0)}%
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Réussis
                  </span>
                  <span className="font-mono text-green-500">{challenge.successfulAttempts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Échoués
                  </span>
                  <span className="font-mono text-red-500">{challenge.failedAttempts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <TrendingDown className="h-4 w-4" />
                    Joueurs uniques
                  </span>
                  <span className="font-mono">{challenge.uniquePlayers}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-xs font-medium">
                  {getDifficultyLabel(challenge.successRate)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Flame className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucune donnée de soumission disponible</p>
        </div>
      )}
    </div>
  );
};

export default ChallengeHeatmap;