import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Terminal, Download, Lightbulb, Loader2, User } from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  category: string;
  points: number;
  description: string;
  hint: string | null;
  file_url: string | null;
  solved?: boolean;
}

interface ChallengeModalProps {
  challenge: Challenge | null;
  isOpen: boolean;
  onClose: () => void;
  onSolve: (challengeId: string) => void;
}

// Generate a unique session ID for anonymous players
const getSessionId = () => {
  let sessionId = localStorage.getItem('ctf_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('ctf_session_id', sessionId);
  }
  return sessionId;
};

const ChallengeModal = ({ challenge, isOpen, onClose, onSolve }: ChallengeModalProps) => {
  const [flag, setFlag] = useState("");
  const [pseudo, setPseudo] = useState(() => localStorage.getItem('ctf_pseudo') || "");
  const [isChecking, setIsChecking] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const { toast } = useToast();
  const { user, session } = useAuth();

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
        toast({
          title: "🎉 Flag correct !",
          description: data.message,
          className: "bg-primary/20 border-primary text-foreground",
        });
        onSolve(challenge.id);
        setFlag("");
        setShowHint(false);
        onClose();
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
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
              <Terminal className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-mono text-xl">{challenge.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono">
                  {challenge.category}
                </Badge>
                <span className="text-primary font-mono font-bold">
                  {challenge.points} pts
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{challenge.description}</p>
          </div>

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