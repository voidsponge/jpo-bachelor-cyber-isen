import { Link, useLocation } from "react-router-dom";
import { Terminal, Trophy, Shield, Home } from "lucide-react";

const Navbar = () => {
  const location = useLocation();

  const links = [
    { to: "/", label: "Accueil", icon: Home },
    { to: "/arena", label: "Arena", icon: Terminal },
    { to: "/leaderboard", label: "Classement", icon: Trophy },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <Shield className="h-8 w-8 text-primary transition-all group-hover:drop-shadow-[0_0_10px_hsl(var(--primary))]" />
            <span className="font-mono text-lg font-bold tracking-tight">
              <span className="text-primary">ISEN</span>
              <span className="text-foreground">_CTF</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-mono text-sm transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary glow-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
