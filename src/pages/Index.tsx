import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Terminal,
  Trophy,
  ChevronRight,
  Lock,
  Code,
  ExternalLink,
  GraduationCap,
  Zap,
  Users,
} from "lucide-react";
import MatrixRain from "@/components/MatrixRain";
import Navbar from "@/components/Navbar";
import TrollOverlay from "@/components/TrollOverlay";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { data: challenges = [] } = useQuery({
    queryKey: ["challenges-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges_public")
        .select("points")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const totalChallenges = challenges.length;
  const totalPoints = challenges.reduce((sum, c) => sum + (c.points || 0), 0);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />

      {/* Hero Section - Full Screen Matrix */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Matrix Background - Full opacity */}
        <div className="absolute inset-0 bg-[#050a0f]">
          <MatrixRain opacity={1} speed={0.25} density={1.2} />
        </div>

        {/* Dark vignette overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/60 to-background pointer-events-none" />

        {/* Scan line effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-full h-[2px] bg-primary/20"
            style={{
              animation: "scan-line 4s linear infinite",
              boxShadow: "0 0 50px 20px hsl(var(--primary) / 0.1)",
            }}
          />
        </div>

        {/* Content */}
        <div className="container relative z-10 px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Live badge */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-primary/50 bg-primary/10 backdrop-blur-sm mb-8 animate-fade-in">
              <div className="relative">
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                <div className="absolute inset-0 h-3 w-3 rounded-full bg-primary animate-ping" />
              </div>
              <span className="font-mono text-sm text-primary font-semibold tracking-wider">
                JOURNÉES PORTES OUVERTES 2026
              </span>
            </div>

            {/* Main title with glitch effect */}
            <h1
              className="font-mono text-6xl md:text-8xl font-bold mb-6 tracking-tight animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="relative inline-block">
                <span className="text-primary glow-text glitch" data-text="ISEN">
                  ISEN
                </span>
              </span>
              <br />
              <span className="text-foreground">CYBER</span>
              <span className="text-primary glow-text">CTF</span>
              <span className="terminal-cursor text-primary">_</span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-4 animate-fade-in font-mono"
              style={{ animationDelay: "0.2s" }}
            >
              <span className="text-primary">&gt;</span> Capture The Flag Challenge
            </p>
            <p
              className="text-lg text-foreground/80 max-w-xl mx-auto mb-10 animate-fade-in"
              style={{ animationDelay: "0.25s" }}
            >
              Teste tes compétences en cybersécurité et découvre le{" "}
              <span className="text-primary font-semibold">Bachelor Cybersécurité</span> de l'ISEN
            </p>

            {/* CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <Link to="/arena">
                <Button size="lg" className="font-mono gap-2 text-lg px-8 py-6 hover-glow group">
                  <Terminal className="h-5 w-5 group-hover:animate-pulse" />
                  Commencer le Hack
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="font-mono gap-2 text-lg px-8 py-6 border-primary/30 hover:bg-primary/10 hover:border-primary"
                >
                  <Trophy className="h-5 w-5" />
                  Classement Live
                </Button>
              </Link>
            </div>

            {/* Quick stats */}
            <div
              className="grid grid-cols-3 gap-6 max-w-md mx-auto mt-16 animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="text-center p-4 rounded-lg bg-card/30 backdrop-blur-sm border border-primary/20">
                <div className="font-mono text-3xl font-bold text-primary glow-text">{totalChallenges}</div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Challenges</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-card/30 backdrop-blur-sm border border-primary/20">
                <div className="font-mono text-3xl font-bold text-primary glow-text">{totalPoints}</div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Points</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-card/30 backdrop-blur-sm border border-primary/20">
                <div className="font-mono text-3xl font-bold text-primary glow-text">∞</div>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Essais</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <div className="w-6 h-10 rounded-full border-2 border-primary/50 flex items-start justify-center p-2">
            <div className="w-1.5 h-2.5 rounded-full bg-primary animate-pulse" />
          </div>
        </div>
      </section>

      {/* Formation Section */}
      <section className="relative py-24 bg-gradient-to-b from-background via-secondary/20 to-background">
        <div className="container px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm text-primary">FORMATION</span>
            </div>
            <h2 className="font-mono text-4xl md:text-5xl font-bold mb-4">
              <span className="text-primary glow-text">Bachelor</span> Cybersécurité
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              3 ans pour devenir expert en sécurité informatique à l'ISEN Yncréa Méditerranée
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            <div className="group p-6 rounded-xl border border-border bg-card/50 hover:border-primary/50 hover-glow transition-all duration-300">
              <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-mono text-xl font-semibold mb-3">Pentest & Red Team</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Apprends à identifier et exploiter les vulnérabilités. Tests d'intrusion, hacking éthique et simulation
                d'attaques.
              </p>
            </div>

            <div className="group p-6 rounded-xl border border-border bg-card/50 hover:border-primary/50 hover-glow transition-all duration-300">
              <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-mono text-xl font-semibold mb-3">Cryptographie</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Maîtrise les algorithmes de chiffrement, PKI, blockchain et protocoles de sécurité modernes.
              </p>
            </div>

            <div className="group p-6 rounded-xl border border-border bg-card/50 hover:border-primary/50 hover-glow transition-all duration-300">
              <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <Code className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-mono text-xl font-semibold mb-3">Développement Sécurisé</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Code des applications robustes, audite le code source et sécurise les architectures.
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
            <div className="text-center p-6 rounded-xl border border-border bg-card/30">
              <Zap className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="font-mono text-2xl font-bold text-foreground">3 ans</div>
              <div className="text-xs text-muted-foreground">Formation</div>
            </div>
            <div className="text-center p-6 rounded-xl border border-border bg-card/30">
              <Users className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="font-mono text-2xl font-bold text-foreground">90%</div>
              <div className="text-xs text-muted-foreground">Employabilité</div>
            </div>
            <div className="text-center p-6 rounded-xl border border-border bg-card/30">
              <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="font-mono text-2xl font-bold text-foreground">Bac+3</div>
              <div className="text-xs text-muted-foreground">Diplôme</div>
            </div>
            <div className="text-center p-6 rounded-xl border border-border bg-card/30">
              <Terminal className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="font-mono text-2xl font-bold text-foreground">Toulon</div>
              <div className="text-xs text-muted-foreground">Campus</div>
            </div>
          </div>

          {/* CTA to School Page */}
          <div className="text-center">
            <a
              href="https://isen-mediterranee.fr/formation/bachelor-cybersecurite/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                variant="outline"
                className="font-mono gap-3 text-lg px-10 py-6 border-primary hover:bg-primary hover:text-primary-foreground transition-all group"
              >
                <GraduationCap className="h-5 w-5" />
                Découvrir la formation
                <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </a>
            <p className="text-sm text-muted-foreground mt-4 font-mono">isen-mediterranee.fr</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-card/30">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="font-mono text-3xl md:text-4xl font-bold mb-4">
              Comment ça <span className="text-primary">marche</span> ?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto mb-4 font-mono text-2xl font-bold text-primary">
                1
              </div>
              <h3 className="font-mono text-lg font-semibold mb-2">Choisis un challenge</h3>
              <p className="text-muted-foreground text-sm">
                Web, Crypto, OSINT, Stegano... 6 catégories pour tester tes skills
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto mb-4 font-mono text-2xl font-bold text-primary">
                2
              </div>
              <h3 className="font-mono text-lg font-semibold mb-2">Trouve le flag</h3>
              <p className="text-muted-foreground text-sm">
                Analyse, recherche et hacking pour découvrir le flag caché
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto mb-4 font-mono text-2xl font-bold text-primary">
                3
              </div>
              <h3 className="font-mono text-lg font-semibold mb-2">Gagne des points</h3>
              <p className="text-muted-foreground text-sm">Monte dans le classement et montre que tu as le niveau !</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link to="/arena">
              <Button size="lg" className="font-mono gap-2 px-8 hover-glow">
                <Terminal className="h-5 w-5" />
                Lancer l'Arena
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-background">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <span className="font-mono text-sm text-foreground font-semibold">ISEN Yncréa Méditerranée</span>
                <span className="text-muted-foreground text-sm ml-2">- Toulon</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://isen-mediterranee.fr/formation/bachelor-cybersecurite/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono flex items-center gap-1"
              >
                Bachelor Cybersécurité
                <ExternalLink className="h-3 w-3" />
              </a>
              {/* Hidden flag for Web challenge - DO NOT REMOVE */}
              {/* FLAG: ISEN{inspect_element_master} */}
              <span className="text-sm text-muted-foreground font-mono">JPO 2026</span>
            </div>
          </div>
        </div>
      </footer>

      <TrollOverlay />
    </div>
  );
};

export default Index;
