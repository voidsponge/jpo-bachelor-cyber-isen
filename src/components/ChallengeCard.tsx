import { useState, useRef, useEffect } from "react";
import { Lock, CheckCircle2, Globe, Search, Key, Image, Code, Network, Skull, QrCode, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface Challenge {
  id: string;
  title: string;
  category: "Web" | "OSINT" | "Crypto" | "Stegano" | "Logic" | "Forensics" | "QR CODE";
  points: number;
  description: string;
  hint?: string | null;
  file_url?: string | null;
  solved: boolean;
  firstBlood?: string;
  difficulty?: number;
}

const DifficultyIndicator = ({ level }: { level: number }) => {
  const skulls = Array.from({ length: 3 }, (_, i) => (
    <Skull
      key={i}
      className={`h-3.5 w-3.5 ${i < level ? "text-red-500" : "text-muted-foreground/30"}`}
    />
  ));
  const labels = ["Facile", "Moyen", "Difficile"];
  return (
    <div className="flex items-center gap-1" title={labels[level - 1] || "Facile"}>
      {skulls}
    </div>
  );
};

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
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
  "QR CODE": QrCode,
};

const categoryColors = {
  Web: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  OSINT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Crypto: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Stegano: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Logic: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Forensics: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "QR CODE": "bg-green-500/20 text-green-400 border-green-500/30",
};

const SPARK_COLORS = [
  "hsl(0 84% 60%)",
  "hsl(0 84% 80%)",
  "hsl(40 100% 70%)",
  "hsl(0 0% 100%)",
];

const ChallengeCard = ({ challenge, onClick }: ChallengeCardProps) => {
  const Icon = categoryIcons[challenge.category];
  const [isFlipped, setIsFlipped] = useState(challenge.solved);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const prevSolved = useRef(challenge.solved);
  const particleInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const particleIdRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Trigger flip when solved state changes
  useEffect(() => {
    if (challenge.solved && !prevSolved.current) {
      // Small delay so the modal closes first
      setTimeout(() => setIsFlipped(true), 300);
    }
    prevSolved.current = challenge.solved;
  }, [challenge.solved]);

  useEffect(() => {
    setIsFlipped(challenge.solved);
  }, []);

  // Spark particles on hover
  useEffect(() => {
    if (isHovered) {
      particleInterval.current = setInterval(() => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        const newParticles: Particle[] = Array.from({ length: 3 }, () => {
          // Spawn along edges
          const edge = Math.floor(Math.random() * 4);
          let x = 0, y = 0;
          if (edge === 0) { x = Math.random() * w; y = 0; }
          else if (edge === 1) { x = w; y = Math.random() * h; }
          else if (edge === 2) { x = Math.random() * w; y = h; }
          else { x = 0; y = Math.random() * h; }

          const angle = Math.random() * Math.PI * 2;
          const speed = 0.8 + Math.random() * 1.5;
          return {
            id: particleIdRef.current++,
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            life: 1,
            size: 2 + Math.random() * 3,
            color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
          };
        });

        setParticles(prev => [...prev.slice(-40), ...newParticles]);
      }, 60);
    } else {
      if (particleInterval.current) clearInterval(particleInterval.current);
      setParticles([]);
    }

    return () => {
      if (particleInterval.current) clearInterval(particleInterval.current);
    };
  }, [isHovered]);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;
    const raf = requestAnimationFrame(() => {
      setParticles(prev =>
        prev
          .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.1, life: p.life - 0.04 }))
          .filter(p => p.life > 0)
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [particles]);

  return (
    <div
      ref={cardRef}
      className="relative"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Spark canvas overlay */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-lg">
          <svg className="w-full h-full">
            {particles.map(p => (
              <circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r={p.size * p.life}
                fill={p.color}
                opacity={p.life}
              />
            ))}
          </svg>
        </div>
      )}

      {/* Flip container */}
      <div
        className="relative w-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: "200px",
        }}
      >
        {/* FRONT */}
        <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
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
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-bold text-primary glow-text">
                    {challenge.points}
                    <span className="text-sm text-muted-foreground ml-1">pts</span>
                  </span>
                  <DifficultyIndicator level={challenge.difficulty || 1} />
                </div>
                {challenge.firstBlood && (
                  <Badge variant="secondary" className="font-mono text-xs bg-destructive/20 text-destructive border-destructive/30">
                    🩸 {challenge.firstBlood}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BACK — golden badge */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <Card
            onClick={onClick}
            className="cursor-pointer h-full border-yellow-500/60 bg-gradient-to-br from-yellow-950/60 via-card/80 to-yellow-900/30 backdrop-blur-sm overflow-hidden"
            style={{ boxShadow: "0 0 30px hsl(40 100% 50% / 0.3), inset 0 0 30px hsl(40 100% 50% / 0.05)" }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-400/10 to-transparent pointer-events-none" />

            <CardContent className="flex flex-col items-center justify-center h-full py-8 gap-4 relative">
              {/* Gold trophy */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-yellow-400/30 blur-xl scale-150" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg"
                  style={{ boxShadow: "0 0 20px hsl(40 100% 50% / 0.6)" }}>
                  <Trophy className="h-8 w-8 text-yellow-950" />
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="font-mono text-xs text-yellow-400/70 uppercase tracking-widest">Flag capturé</p>
                <h3 className="font-mono text-base font-bold text-yellow-300 line-clamp-2 text-center px-2">
                  {challenge.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-4 py-1.5">
                <span className="font-mono text-xl font-bold text-yellow-400">+{challenge.points}</span>
                <span className="font-mono text-xs text-yellow-500">pts</span>
              </div>

              <p className="font-mono text-xs text-yellow-600/60 mt-1">Cliquer pour détails</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChallengeCard;
