import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Terminal, Download, Lightbulb, Loader2, User, Skull, ExternalLink, Container } from "lucide-react";
import confetti from "canvas-confetti";
import LinuxTerminal from "./LinuxTerminal";
import DockerTerminal from "./DockerTerminal";

interface Challenge {
  id: string;
  title: string;
  category: string;
  points: number;
  description: string;
  hint: string | null;
  file_url: string | null;
  solved?: boolean;
  difficulty?: number;
  isTerminalChallenge?: boolean;
  externalUrl?: string | null;
  dockerImage?: string | null;
  dockerPorts?: string | null;
}

// Confetti celebration function
const triggerConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);
    
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
    });
  }, 250);
};

const DifficultyIndicator = ({ level }: { level: number }) => {
  const skulls = Array.from({ length: 3 }, (_, i) => (
    <Skull
      key={i}
      className={`h-4 w-4 ${i < level ? "text-red-500" : "text-muted-foreground/30"}`}
    />
  ));
  const labels = ["Facile", "Moyen", "Difficile"];
  return (
    <div className="flex items-center gap-1" title={labels[level - 1] || "Facile"}>
      {skulls}
    </div>
  );
};

interface ChallengeModalProps {
  challenge: Challenge | null;
  isOpen: boolean;
  onClose: () => void;
  onSolve: (challengeId: string) => void;
}

// Generate a unique session ID for anonymous players (uses sessionStorage for per-session reset)
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('ctf_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('ctf_session_id', sessionId);
  }
  return sessionId;
};

// Generate random flag for terminal challenges
const generateTerminalFlag = () => {
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `ISEN{L1NUX_M4ST3R_${randomPart}}`;
};

const ChallengeModal = ({ challenge, isOpen, onClose, onSolve }: ChallengeModalProps) => {
  const [flag, setFlag] = useState("");
  const [pseudo, setPseudo] = useState(() => localStorage.getItem('ctf_pseudo') || "");
  const [isChecking, setIsChecking] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [terminalFlag, setTerminalFlag] = useState("");
  const [terminalFlagFound, setTerminalFlagFound] = useState(false);
  const { toast } = useToast();
  const { user, session } = useAuth();

  // Generate terminal flag when modal opens for terminal challenges
  useEffect(() => {
    if (isOpen && challenge?.isTerminalChallenge && !challenge.solved) {
      setTerminalFlag(generateTerminalFlag());
      setTerminalFlagFound(false);
    }
  }, [isOpen, challenge?.id, challenge?.isTerminalChallenge, challenge?.solved]);

  // Save pseudo to localStorage when it changes
  useEffect(() => {
    if (pseudo) {
      localStorage.setItem('ctf_pseudo', pseudo);
    }
  }, [pseudo]);

  if (!challenge) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!flag.trim()) return;

    // For anonymous players, require a pseudo
    if (!user && !pseudo.trim()) {
      toast({
        title: "Pseudo requis",
        description: "Entre un pseudo pour participer",
        variant: "destructive",
      });
      return;
    }

    if (!user && (pseudo.length < 2 || pseudo.length > 30)) {
      toast({
        title: "Pseudo invalide",
        description: "Le pseudo doit faire entre 2 et 30 caractères",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);

    try {
      const requestBody: any = {
        challengeId: challenge.id,
        submittedFlag: flag.trim(),
      };

      // Add anonymous player data if not logged in
      if (!user) {
        requestBody.sessionId = getSessionId();
        requestBody.pseudo = pseudo.trim();
      }

      const { data, error } = await supabase.functions.invoke("verify-flag", {
        body: requestBody,
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        // Trigger confetti celebration!
        triggerConfetti();
        
        toast({
          title: "🎉 Flag correct !",
          description: data.message,
          className: "bg-primary/20 border-primary text-foreground",
        });
        onSolve(challenge.id);
        setFlag("");
        setShowHint(false);
        
        // Delay close to see confetti
        setTimeout(() => onClose(), 1500);
      } else if (data.alreadySolved) {
        toast({
          title: "Déjà résolu",
          description: data.message,
        });
      } else {
        toast({
          title: "❌ Flag incorrect",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting flag:", error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier le flag",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`bg-card border-border ${(challenge.isTerminalChallenge || challenge.dockerImage) ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
              <Terminal className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="font-mono text-xl">{challenge.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono">
                  {challenge.category}
                </Badge>
                <span className="text-primary font-mono font-bold">
                  {challenge.points} pts
                </span>
                {challenge.difficulty && (
                  <DifficultyIndicator level={challenge.difficulty} />
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{challenge.description}</p>
          </div>

          {/* Linux Terminal for terminal challenges */}
          {challenge.isTerminalChallenge && !challenge.solved && terminalFlag && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-mono">
                Terminal interactif - trouve le flag caché dans le système de fichiers
              </p>
              <LinuxTerminal 
                secretFlag={terminalFlag} 
                onFlagFound={() => {
                  setTerminalFlagFound(true);
                  setFlag(terminalFlag);
                  toast({
                    title: "🔍 Flag trouvé !",
                    description: "Le flag a été copié. Soumets-le pour valider !",
                    className: "bg-primary/20 border-primary text-foreground",
                  });
                }} 
              />
              {terminalFlagFound && (
                <p className="text-sm text-primary font-mono animate-pulse">
                  ✓ Flag trouvé et copié dans le champ ci-dessous !
                </p>
              )}
            </div>
          )}

          {/* Docker Terminal for docker challenges */}
          {challenge.dockerImage && !challenge.solved && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-mono flex items-center gap-2">
                <Container className="h-4 w-4" />
                Container Docker interactif
              </p>
              <DockerTerminal
                dockerImage={challenge.dockerImage}
                dockerPorts={challenge.dockerPorts || undefined}
                sessionId={getSessionId()}
                challengeId={challenge.id}
              />
            </div>
          )}

          {challenge.hint && (
            <div>
              {showHint ? (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-2 text-yellow-500 text-sm font-mono mb-1">
                    <Lightbulb className="h-4 w-4" />
                    Indice
                  </div>
                  <p className="text-sm text-foreground">{challenge.hint}</p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHint(true)}
                  className="gap-2 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10"
                >
                  <Lightbulb className="h-4 w-4" />
                  Voir l'indice
                </Button>
              )}
            </div>
          )}

          {challenge.externalUrl && (
            <Button variant="outline" className="w-full gap-2 font-mono border-primary/50 hover:bg-primary/10" asChild>
              <a href={challenge.externalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 text-primary" />
                Accéder au challenge (VM/Docker)
              </a>
            </Button>
          )}

          {challenge.file_url && (
            <Button variant="outline" className="w-full gap-2 font-mono" asChild>
              <a href={challenge.file_url} download>
                <Download className="h-4 w-4" />
                Télécharger le fichier
              </a>
            </Button>
          )}

          {challenge.solved ? (
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary/10 border border-primary/30">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="font-mono text-primary">Challenge résolu !</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pseudo field for anonymous players */}
              {!user && (
                <div className="relative">
                  <Input
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    placeholder="Ton pseudo"
                    className="font-mono bg-background border-border pr-10 focus:border-primary focus:ring-primary"
                    disabled={isChecking}
                    maxLength={30}
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              )}

              <div className="relative">
                <Input
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  placeholder="ISEN{...}"
                  className="font-mono bg-background border-border pr-10 focus:border-primary focus:ring-primary"
                  disabled={isChecking}
                />
                <Terminal className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              
              {!user && (
                <p className="text-xs text-muted-foreground text-center">
                  Tu joues en tant qu'invité. Ton pseudo apparaîtra sur le leaderboard.
                </p>
              )}
              
              <Button
                type="submit"
                className="w-full font-mono gap-2"
                disabled={!flag.trim() || isChecking || (!user && !pseudo.trim())}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <Terminal className="h-4 w-4" />
                    Soumettre le flag
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChallengeModal;