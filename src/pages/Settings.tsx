import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Lock, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  // Redirect if not authenticated
  if (!user) {
    navigate("/auth");
    return null;
  }

  const validatePassword = () => {
    try {
      passwordSchema.parse({ newPassword, confirmPassword });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { newPassword?: string; confirmPassword?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === "newPassword") {
            fieldErrors.newPassword = err.message;
          }
          if (err.path[0] === "confirmPassword") {
            fieldErrors.confirmPassword = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "✅ Mot de passe modifié",
        description: "Ton mot de passe a été mis à jour avec succès",
        className: "bg-primary/20 border-primary",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de changer le mot de passe",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthColors = ["bg-destructive", "bg-destructive", "bg-yellow-500", "bg-yellow-500", "bg-primary", "bg-primary"];
  const strengthLabels = ["", "Faible", "Faible", "Moyen", "Fort", "Très fort"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-4 pt-24 pb-12 max-w-2xl">
        <div className="mb-8">
          <h1 className="font-mono text-3xl md:text-4xl font-bold mb-2">
            <span className="text-primary">Para</span>mètres
          </h1>
          <p className="text-muted-foreground">
            Gère ton compte et ta sécurité
          </p>
        </div>

        {/* Account Info */}
        <Card className="mb-6 bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              Informations du compte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-mono">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-sm text-muted-foreground">{user.id.slice(0, 8)}...</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Changer le mot de passe
            </CardTitle>
            <CardDescription>
              Utilise un mot de passe fort avec majuscules, minuscules et chiffres
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`bg-background/50 pr-10 ${errors.newPassword ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-destructive">{errors.newPassword}</p>
                )}
                
                {/* Password strength indicator */}
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= passwordStrength ? strengthColors[passwordStrength] : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Force: {strengthLabels[passwordStrength]}
                    </p>
                  </div>
                )}

                {/* Requirements checklist */}
                <div className="space-y-1 text-sm">
                  <div className={`flex items-center gap-2 ${newPassword.length >= 8 ? "text-primary" : "text-muted-foreground"}`}>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>8 caractères minimum</span>
                  </div>
                  <div className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? "text-primary" : "text-muted-foreground"}`}>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Une majuscule</span>
                  </div>
                  <div className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? "text-primary" : "text-muted-foreground"}`}>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Une minuscule</span>
                  </div>
                  <div className={`flex items-center gap-2 ${/[0-9]/.test(newPassword) ? "text-primary" : "text-muted-foreground"}`}>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Un chiffre</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`bg-background/50 ${errors.confirmPassword ? "border-destructive" : ""}`}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !newPassword || !confirmPassword}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Changer le mot de passe
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;