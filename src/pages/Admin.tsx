import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Pencil, Trash2, Users, FileText, Loader2, RefreshCw } from "lucide-react";

type ChallengeCategory = "Web" | "OSINT" | "Crypto" | "Stegano" | "Logic" | "Forensics";

interface Challenge {
  id: string;
  title: string;
  category: ChallengeCategory;
  points: number;
  description: string;
  hint: string | null;
  flag: string;
  is_active: boolean;
  created_at: string;
}

interface Submission {
  id: string;
  submitted_flag: string;
  is_correct: boolean;
  submitted_at: string;
  profiles: { username: string } | null;
  challenges: { title: string } | null;
}

const Admin = () => {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [activeTab, setActiveTab] = useState<"challenges" | "submissions" | "users">("challenges");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    category: "Web" as ChallengeCategory,
    points: 100,
    description: "",
    hint: "",
    flag: "",
    is_active: true,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Tu n'as pas les droits d'accès à cette page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });

      if (challengesError) throw challengesError;
      setChallenges(challengesData || []);

      // Fetch recent submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submissions")
        .select(`
          id,
          submitted_flag,
          is_correct,
          submitted_at,
          profiles!submissions_user_id_fkey(username),
          challenges!submissions_challenge_id_fkey(title)
        `)
        .order("submitted_at", { ascending: false })
        .limit(50);

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData as unknown as Submission[] || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingChallenge) {
        const { error } = await supabase
          .from("challenges")
          .update(formData)
          .eq("id", editingChallenge.id);
        
        if (error) throw error;
        
        toast({
          title: "Challenge mis à jour",
          description: `"${formData.title}" a été modifié`,
          className: "bg-primary/20 border-primary",
        });
      } else {
        const { error } = await supabase
          .from("challenges")
          .insert(formData);
        
        if (error) throw error;
        
        toast({
          title: "Challenge créé",
          description: `"${formData.title}" a été ajouté`,
          className: "bg-primary/20 border-primary",
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving challenge:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le challenge",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (challenge: Challenge) => {
    if (!confirm(`Supprimer "${challenge.title}" ?`)) return;
    
    try {
      const { error } = await supabase
        .from("challenges")
        .delete()
        .eq("id", challenge.id);
      
      if (error) throw error;
      
      toast({
        title: "Challenge supprimé",
        description: `"${challenge.title}" a été supprimé`,
      });
      
      fetchData();
    } catch (error) {
      console.error("Error deleting challenge:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le challenge",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (challenge: Challenge) => {
    try {
      const { error } = await supabase
        .from("challenges")
        .update({ is_active: !challenge.is_active })
        .eq("id", challenge.id);
      
      if (error) throw error;
      
      toast({
        title: challenge.is_active ? "Challenge désactivé" : "Challenge activé",
        description: `"${challenge.title}" est maintenant ${challenge.is_active ? "inactif" : "actif"}`,
      });
      
      fetchData();
    } catch (error) {
      console.error("Error toggling challenge:", error);
    }
  };

  const openEditDialog = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      category: challenge.category,
      points: challenge.points,
      description: challenge.description,
      hint: challenge.hint || "",
      flag: challenge.flag,
      is_active: challenge.is_active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingChallenge(null);
    setFormData({
      title: "",
      category: "Web",
      points: 100,
      description: "",
      hint: "",
      flag: "",
      is_active: true,
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-mono text-3xl md:text-4xl font-bold mb-2">
              <span className="text-primary">Admin</span> Panel
            </h1>
            <p className="text-muted-foreground">
              Gère les challenges et surveille les participants
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "challenges" ? "default" : "outline"}
            onClick={() => setActiveTab("challenges")}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Challenges ({challenges.length})
          </Button>
          <Button
            variant={activeTab === "submissions" ? "default" : "outline"}
            onClick={() => setActiveTab("submissions")}
            className="gap-2"
          >
            <Shield className="h-4 w-4" />
            Soumissions ({submissions.length})
          </Button>
        </div>

        {/* Challenges Tab */}
        {activeTab === "challenges" && (
          <Card className="bg-card/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-mono">Gestion des Challenges</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nouveau Challenge
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg bg-card">
                  <DialogHeader>
                    <DialogTitle className="font-mono">
                      {editingChallenge ? "Modifier le challenge" : "Nouveau challenge"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Titre</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        className="bg-background"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Catégorie</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value: ChallengeCategory) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Web">Web</SelectItem>
                            <SelectItem value="OSINT">OSINT</SelectItem>
                            <SelectItem value="Crypto">Crypto</SelectItem>
                            <SelectItem value="Stegano">Stegano</SelectItem>
                            <SelectItem value="Logic">Logic</SelectItem>
                            <SelectItem value="Forensics">Forensics</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={formData.points}
                          onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                          required
                          min={10}
                          max={1000}
                          className="bg-background"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                        rows={3}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Indice (optionnel)</Label>
                      <Input
                        value={formData.hint}
                        onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Flag (réponse)</Label>
                      <Input
                        value={formData.flag}
                        onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                        required
                        placeholder="ISEN{...}"
                        className="bg-background font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label>Challenge actif</Label>
                    </div>
                    <Button type="submit" className="w-full">
                      {editingChallenge ? "Mettre à jour" : "Créer le challenge"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Flag</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challenges.map((challenge) => (
                    <TableRow key={challenge.id}>
                      <TableCell className="font-mono font-medium">{challenge.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{challenge.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-primary">{challenge.points}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[150px] truncate">
                        {challenge.flag}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={challenge.is_active}
                          onCheckedChange={() => handleToggleActive(challenge)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(challenge)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(challenge)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Submissions Tab */}
        {activeTab === "submissions" && (
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="font-mono">Dernières Soumissions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joueur</TableHead>
                    <TableHead>Challenge</TableHead>
                    <TableHead>Flag soumis</TableHead>
                    <TableHead>Résultat</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono">
                        {sub.profiles?.username || "Inconnu"}
                      </TableCell>
                      <TableCell>{sub.challenges?.title || "Inconnu"}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[150px] truncate">
                        {sub.submitted_flag}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.is_correct ? "default" : "destructive"}>
                          {sub.is_correct ? "✓ Correct" : "✗ Incorrect"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(sub.submitted_at).toLocaleString("fr-FR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Admin;
