import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Challenge } from "./ChallengeCard";
import { CheckCircle2, XCircle, Terminal, Download } from "lucide-react";

interface ChallengeModalProps {
  challenge: Challenge | null;
  isOpen: boolean;
  onClose: () => void;
  onSolve: (challengeId: string) => void;
}

// Mock flags for demo
const mockFlags: Record<string, string> = {
  "1": "ISEN{inspect_element_master}",
  "2": "ISEN{osint_detective}",
  "3": "ISEN{caesar_cipher_cracked}",
  "4": "ISEN{hidden_in_plain_sight}",
  "5": "ISEN{twelve_chars!}",
  "6": "ISEN{packet_sniffer}",
};

const ChallengeModal = ({ challenge, isOpen, onClose, onSolve }: ChallengeModalProps) => {
  const [flag, setFlag] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  if (!challenge) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const correctFlag = mockFlags[challenge.id];
    
    if (flag.trim().toLowerCase() === correctFlag.toLowerCase()) {
      toast({
        title: "🎉 Flag correct !",
        description: `+${challenge.points} points ! Tu as résolu "${challenge.title}"`,
        className: "bg-primary/20 border-primary text-foreground",
      });
      onSolve(challenge.id);
      setFlag("");
      onClose();
    } else {
      toast({
        title: "❌ Flag incorrect",
        description: "Essaie encore, tu peux le faire !",
        variant: "destructive",
      });
    }

    setIsChecking(false);
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
            <p className="text-foreground leading-relaxed">{challenge.description}</p>
          </div>

          {/* Hint for demo */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground font-mono">
              <span className="text-primary">// HINT (démo):</span> Le flag est au format ISEN{"{...}"}
            </p>
          </div>

          {challenge.category === "Stegano" && (
            <Button variant="outline" className="w-full gap-2 font-mono">
              <Download className="h-4 w-4" />
              Télécharger le fichier
            </Button>
          )}

          {challenge.solved ? (
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-primary/10 border border-primary/30">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="font-mono text-primary">Challenge résolu !</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <Button
                type="submit"
                className="w-full font-mono gap-2"
                disabled={!flag.trim() || isChecking}
              >
                {isChecking ? (
                  <>
                    <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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
