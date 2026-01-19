import { Link, useLocation } from "react-router-dom";
import { Terminal, Trophy, Home, LogIn, LogOut, Settings, UserCog } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import isenLogo from "@/assets/isen-logo.png";

const Navbar = () => {
  const location = useLocation();
  const { user, username, isAdmin, signOut } = useAuth();

  const links = [
    { to: "/", label: "Accueil", icon: Home },
    { to: "/arena", label: "Arena", icon: Terminal },
    { to: "/leaderboard", label: "Classement", icon: Trophy },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={isenLogo} alt="ISEN Méditerranée" className="h-8 w-auto rounded px-1" />
            <span className="font-mono text-lg font-bold tracking-tight">
              <span className="text-primary">CYBER</span>
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

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="ml-2 font-mono gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {username?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="hidden sm:inline">{username || "User"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Connecté en tant que<br />
                    <span className="font-mono text-foreground">{username}</span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                      <UserCog className="h-4 w-4" />
                      Paramètres
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" />
                        Panel Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="outline" className="ml-2 font-mono gap-2">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Connexion</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
