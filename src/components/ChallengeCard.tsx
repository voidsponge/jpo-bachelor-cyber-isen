import { Lock, CheckCircle2, Globe, Search, Key, Image, Code, Network } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface Challenge {
  id: string;
  title: string;
  category: "Web" | "OSINT" | "Crypto" | "Stegano" | "Logic" | "Forensics";
  points: number;
  description: string;
  hint?: string | null;
  file_url?: string | null;
  solved: boolean;
  firstBlood?: string;
}

interface ChallengeCardProps {
  challenge: Challenge;
  onClick: () => void;
}

const categoryIcons = {
  Web: Globe,
  OSINT: Search,
  Crypto: Key,
  Stegano: Image,
  Logic: Code,
  Forensics: Network,
};

const categoryColors = {
  Web: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  OSINT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Crypto: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Stegano: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Logic: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Forensics: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const ChallengeCard = ({ challenge, onClick }: ChallengeCardProps) => {
  const Icon = categoryIcons[challenge.category];

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition-all duration-300 hover-glow border-border bg-card/50 backdrop-blur-sm ${
        challenge.solved
          ? "border-primary/50 bg-primary/5"
          : "hover:border-primary/30"
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Badge
            variant="outline"
            className={`${categoryColors[challenge.category]} border font-mono text-xs`}
          >
            <Icon className="mr-1 h-3 w-3" />
            {challenge.category}
          </Badge>
          <div className="flex items-center gap-2">
            {challenge.solved ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <h3 className="font-mono text-lg font-semibold text-foreground">
          {challenge.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {challenge.description}
        </p>
        <div className="flex items-center justify-between pt-2">
          <span className="font-mono text-2xl font-bold text-primary glow-text">
            {challenge.points}
            <span className="text-sm text-muted-foreground ml-1">pts</span>
          </span>
          {challenge.firstBlood && (
            <Badge variant="secondary" className="font-mono text-xs bg-destructive/20 text-destructive border-destructive/30">
              🩸 {challenge.firstBlood}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChallengeCard;
