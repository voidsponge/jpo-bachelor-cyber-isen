import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Terminal, Trophy, ChevronRight, Lock, Code } from "lucide-react";
import MatrixRain from "@/components/MatrixRain";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden cyber-grid">
        <MatrixRain />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background pointer-events-none" />
        
        <div className="container relative z-10 px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8 animate-fade-in">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-sm text-primary">JPO 2025 - Live Challenge</span>
          </div>
          
          <h1 className="font-mono text-5xl md:text-7xl font-bold mb-6 tracking-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <span className="text-primary glow-text">ISEN</span>
            <span className="text-foreground"> CYBER</span>
            <br />
            <span className="text-foreground">CHALLENGE</span>
            <span className="terminal-cursor text-primary">_</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Prouve tes compétences en cybersécurité.
            <br />
            <span className="text-foreground font-medium">Rejoins l'élite.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Link to={user ? "/arena" : "/auth"}>
              <Button size="lg" className="font-mono gap-2 text-lg px-8 hover-glow">
                <Terminal className="h-5 w-5" />
                {user ? "Accéder à l'Arena" : "Commencer le hack"}
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button size="lg" variant="outline" className="font-mono gap-2 text-lg px-8 border-border hover:bg-secondary">
                <Trophy className="h-5 w-5" />
                Voir le classement
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="text-center">
              <div className="font-mono text-3xl font-bold text-primary glow-text">6</div>
              <div className="text-sm text-muted-foreground">Challenges</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-3xl font-bold text-primary glow-text">1500</div>
              <div className="text-sm text-muted-foreground">Points max</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-3xl font-bold text-primary glow-text">∞</div>
              <div className="text-sm text-muted-foreground">Tentatives</div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-2.5 rounded-full bg-primary animate-pulse" />
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-24 bg-secondary/20">
        <div className="container px-4">
          <div className="text-center mb-16">
            <h2 className="font-mono text-3xl md:text-4xl font-bold mb-4">
              <span className="text-primary">Bachelor</span> Cybersécurité
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Forme-toi aux métiers de la sécurité informatique à l'ISEN Yncréa Méditerranée
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-6 rounded-xl border border-border bg-card/50 hover-glow transition-all">
              <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-mono text-xl font-semibold mb-2">Pentest & Red Team</h3>
              <p className="text-muted-foreground text-sm">
                Apprends à identifier et exploiter les vulnérabilités comme un vrai hacker éthique.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card/50 hover-glow transition-all">
              <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-mono text-xl font-semibold mb-2">Cryptographie</h3>
              <p className="text-muted-foreground text-sm">
                Maîtrise les algorithmes de chiffrement et les protocoles de sécurité modernes.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card/50 hover-glow transition-all">
              <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                <Code className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-mono text-xl font-semibold mb-2">Développement Sécurisé</h3>
              <p className="text-muted-foreground text-sm">
                Code des applications robustes et résistantes aux attaques courantes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-mono text-sm text-muted-foreground">
                © 2025 ISEN Yncréa Méditerranée - Toulon
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
              {/* Hidden flag for Web challenge - DO NOT REMOVE */}
              {/* FLAG: ISEN{inspect_element_master} */}
              <span>Made with 💚 for JPO</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
