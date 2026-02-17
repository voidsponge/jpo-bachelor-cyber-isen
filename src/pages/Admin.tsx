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
import { Shield, Plus, Pencil, Trash2, Users, FileText, Loader2, RefreshCw, AlertTriangle, RotateCcw, Skull, Download, BarChart3, Monitor, Ghost, Flame, Play, Upload, X, ExternalLink } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import TrollModePanel from "@/components/TrollModePanel";
import ChallengeHeatmap from "@/components/admin/ChallengeHeatmap";
import SessionReplay from "@/components/admin/SessionReplay";

type ChallengeCategory = "Web" | "OSINT" | "Crypto" | "Stegano" | "Logic" | "Forensics" | "QR CODE";

interface Challenge {
  id: string;
  title: string;
  category: ChallengeCategory;
  points: number;
  description: string;
  hint: string | null;
  flag: string;
  is_active: boolean;
  hide_flag_submission: boolean;
  created_at: string;
  difficulty: number;
  is_terminal_challenge: boolean;
  external_url: string | null;
  file_url: string | null;
  docker_image: string | null;
  docker_ports: string | null;
}

interface Submission {
  id: string;
  submitted_flag: string;
  is_correct: boolean;
  submitted_at: string;
  username: string;
  challenge_title: string;
  is_anonymous: boolean;
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
  const [activeTab, setActiveTab] = useState<"challenges" | "submissions" | "stats" | "troll" | "heatmap" | "replay">("challenges");
  const [isResetting, setIsResetting] = useState(false);
  const [stats, setStats] = useState({ totalSubmissions: 0, totalPlayers: 0, correctSubmissions: 0 });
  const [chartData, setChartData] = useState<{ categoryStats: any[]; solvesByChallenge: any[] }>({ categoryStats: [], solvesByChallenge: [] });

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    category: "Web" as ChallengeCategory,
    points: 100,
    description: "",
    hint: "",
    flag: "",
    is_active: true,
    hide_flag_submission: false,
    difficulty: 1,
    external_url: "",
    file_url: "",
  });
  
  const [isUploading, setIsUploading] = useState(false);

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

      // Fetch recent submissions with separate queries for related data
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submissions")
        .select("id, submitted_flag, is_correct, submitted_at, user_id, player_id, challenge_id")
        .order("submitted_at", { ascending: false })
        .limit(50);

      if (submissionsError) throw submissionsError;

      // Get profiles and players for usernames
      const userIds = [...new Set(submissionsData?.filter(s => s.user_id).map(s => s.user_id) || [])];
      const playerIds = [...new Set(submissionsData?.filter(s => s.player_id).map(s => s.player_id) || [])];
      const challengeIds = [...new Set(submissionsData?.map(s => s.challenge_id) || [])];

      const [profilesRes, playersRes, challengesRes] = await Promise.all([
        userIds.length > 0 
          ? supabase.from("profiles").select("user_id, username").in("user_id", userIds)
          : { data: [] },
        playerIds.length > 0
          ? supabase.from("players").select("id, pseudo").in("id", playerIds)
          : { data: [] },
        challengeIds.length > 0
          ? supabase.from("challenges").select("id, title").in("id", challengeIds)
          : { data: [] }
      ]);

      const profileMap = new Map<string, string>(
        (profilesRes.data || []).map(p => [p.user_id, p.username] as [string, string])
      );
      const playerMap = new Map<string, string>(
        (playersRes.data || []).map(p => [p.id, p.pseudo] as [string, string])
      );
      const challengeMap = new Map<string, string>(
        (challengesRes.data || []).map(c => [c.id, c.title] as [string, string])
      );

      const formattedSubmissions: Submission[] = (submissionsData || []).map(sub => ({
        id: sub.id,
        submitted_flag: sub.submitted_flag,
        is_correct: sub.is_correct,
        submitted_at: sub.submitted_at,
        username: sub.user_id ? (profileMap.get(sub.user_id) || "Inconnu") : (playerMap.get(sub.player_id!) || "Anonyme"),
        challenge_title: challengeMap.get(sub.challenge_id) || "Inconnu",
        is_anonymous: !sub.user_id
      }));

      setSubmissions(formattedSubmissions);

      // Fetch stats for reset info
      const [submissionsCount, playersCount, correctCount] = await Promise.all([
        supabase.from("submissions").select("id", { count: "exact", head: true }),
        supabase.from("players").select("id", { count: "exact", head: true }),
        supabase.from("submissions").select("id", { count: "exact", head: true }).eq("is_correct", true)
      ]);

      setStats({
        totalSubmissions: submissionsCount.count || 0,
        totalPlayers: playersCount.count || 0,
        correctSubmissions: correctCount.count || 0
      });

      // Calculate chart data
      const categoryStats = challengesData?.reduce((acc: any[], c: any) => {
        const existing = acc.find(item => item.category === c.category);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ category: c.category, count: 1 });
        }
        return acc;
      }, []) || [];

      // Solves by challenge
      const { data: allCorrectSubmissions } = await supabase
        .from("submissions")
        .select("challenge_id")
        .eq("is_correct", true);

      const solvesByChallenge = challengesData?.map((c: any) => ({
        name: c.title.length > 15 ? c.title.substring(0, 15) + "..." : c.title,
        solves: allCorrectSubmissions?.filter(s => s.challenge_id === c.id).length || 0,
        points: c.points
      })).sort((a: any, b: any) => b.solves - a.solves).slice(0, 10) || [];

      setChartData({ categoryStats, solvesByChallenge });

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
      hide_flag_submission: challenge.hide_flag_submission || false,
      difficulty: challenge.difficulty || 1,
      external_url: challenge.external_url || "",
      file_url: challenge.file_url || "",
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
      hide_flag_submission: false,
      difficulty: 1,
      external_url: "",
      file_url: "",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 10 Mo",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Create unique filename with timestamp
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${timestamp}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('challenge-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('challenge-files')
        .getPublicUrl(filePath);

      setFormData({ ...formData, file_url: publicUrl });

      toast({
        title: "Fichier uploadé",
        description: file.name,
        className: "bg-primary/20 border-primary",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erreur d'upload",
        description: "Impossible d'uploader le fichier",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFormData({ ...formData, file_url: "" });
  };

  const handleResetCTF = async () => {
    setIsResetting(true);
    try {
      // Delete all submissions first (due to foreign key constraints)
      const { error: submissionsError } = await supabase
        .from("submissions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (submissionsError) throw submissionsError;

      // Delete all anonymous players
      const { error: playersError } = await supabase
        .from("players")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (playersError) throw playersError;

      toast({
        title: "🔄 CTF Réinitialisé",
        description: "Toutes les soumissions et joueurs anonymes ont été supprimés",
        className: "bg-primary/20 border-primary",
      });

      fetchData();
    } catch (error) {
      console.error("Error resetting CTF:", error);
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser le CTF",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const exportLeaderboardCSV = async () => {
    try {
      const { data: subs } = await supabase
        .from("submissions")
        .select("user_id, player_id, challenge_id, submitted_at")
        .eq("is_correct", true);

      const { data: challengesList } = await supabase.from("challenges").select("id, title, points");
      const { data: profilesList } = await supabase.from("profiles").select("user_id, username");
      const { data: playersList } = await supabase.from("players").select("id, pseudo");

      const challengeMap = new Map(challengesList?.map(c => [c.id, c]) || []);
      const profileMap = new Map(profilesList?.map(p => [p.user_id, p.username]) || []);
      const playerMap = new Map(playersList?.map(p => [p.id, p.pseudo]) || []);

      const playerStats = new Map<string, { username: string; score: number; solvedCount: number; lastSolve: string }>();

      subs?.forEach(sub => {
        const key = sub.user_id || sub.player_id;
        if (!key) return;
        const username = sub.user_id ? (profileMap.get(sub.user_id) || "Inconnu") : (playerMap.get(sub.player_id!) || "Anonyme");
        const challenge = challengeMap.get(sub.challenge_id);
        const points = challenge?.points || 0;
        const existing = playerStats.get(key);
        if (existing) {
          existing.score += points;
          existing.solvedCount += 1;
          if (sub.submitted_at > existing.lastSolve) existing.lastSolve = sub.submitted_at;
        } else {
          playerStats.set(key, { username, score: points, solvedCount: 1, lastSolve: sub.submitted_at });
        }
      });

      const sorted = Array.from(playerStats.values()).sort((a, b) => b.score - a.score);
      const csv = "Rang,Joueur,Score,Challenges Résolus,Dernier Flag\n" + 
        sorted.map((p, i) => `${i + 1},"${p.username}",${p.score},${p.solvedCount},"${new Date(p.lastSolve).toLocaleString("fr-FR")}"`).join("\n");

      downloadCSV(csv, "leaderboard.csv");
      toast({ title: "Export réussi", description: "Leaderboard exporté en CSV" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'exporter", variant: "destructive" });
    }
  };

  const exportSubmissionsCSV = () => {
    const csv = "Joueur,Challenge,Flag Soumis,Correct,Date\n" + 
      submissions.map(s => `"${s.username}","${s.challenge_title}","${s.submitted_flag}",${s.is_correct},"${new Date(s.submitted_at).toLocaleString("fr-FR")}"`).join("\n");
    downloadCSV(csv, "submissions.csv");
    toast({ title: "Export réussi", description: "Soumissions exportées en CSV" });
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
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

        {/* Reset CTF Card */}
        <Card className="mb-6 bg-destructive/10 border-destructive/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/20">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-foreground">Réinitialiser le CTF</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.totalSubmissions} soumissions • {stats.correctSubmissions} correctes • {stats.totalPlayers} joueurs anonymes
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2" disabled={isResetting}>
                    {isResetting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Réinitialiser
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-mono text-destructive">
                      ⚠️ Réinitialiser le CTF ?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>Cette action va supprimer :</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li><strong>{stats.totalSubmissions}</strong> soumissions (correctes et incorrectes)</li>
                        <li><strong>{stats.totalPlayers}</strong> joueurs anonymes</li>
                        <li>Tout le classement sera remis à zéro</li>
                      </ul>
                      <p className="text-destructive font-medium mt-4">
                        Cette action est irréversible !
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetCTF}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Oui, réinitialiser tout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
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
          <Button
            variant={activeTab === "stats" ? "default" : "outline"}
            onClick={() => setActiveTab("stats")}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Statistiques
          </Button>
          <Button
            variant={activeTab === "troll" ? "default" : "outline"}
            onClick={() => setActiveTab("troll")}
            className="gap-2"
          >
            <Ghost className="h-4 w-4" />
            Troll Mode 😈
          </Button>
          <Button
            variant={activeTab === "heatmap" ? "default" : "outline"}
            onClick={() => setActiveTab("heatmap")}
            className="gap-2"
          >
            <Flame className="h-4 w-4" />
            Heatmap
          </Button>
          <Button
            variant={activeTab === "replay" ? "default" : "outline"}
            onClick={() => setActiveTab("replay")}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Sessions
          </Button>
          <div className="flex-1" />
          <Button variant="outline" className="gap-2" onClick={() => window.open("/spectator", "_blank")}>
            <Monitor className="h-4 w-4" />
            Mode Spectateur
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportLeaderboardCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Heatmap Tab */}
        {activeTab === "heatmap" && (
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="font-mono flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Heatmap des tentatives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChallengeHeatmap />
            </CardContent>
          </Card>
        )}


        {/* Session Replay Tab */}
        {activeTab === "replay" && (
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="font-mono flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Replay de session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SessionReplay />
            </CardContent>
          </Card>
        )}

        {/* Troll Mode Tab */}
        {activeTab === "troll" && (
          <TrollModePanel />
        )}

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
                <DialogContent className="max-w-2xl bg-card max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="pb-2 border-b border-border">
                    <DialogTitle className="font-mono text-xl flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                        {editingChallenge ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                      </div>
                      {editingChallenge ? "Modifier le challenge" : "Nouveau challenge"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                    {/* Section: Informations générales */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        Informations générales
                      </h3>
                      <div className="space-y-2">
                        <Label>Titre</Label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                          placeholder="Nom du challenge"
                          className="bg-background"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
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
                              <SelectItem value="QR CODE">QR CODE</SelectItem>
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
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5">
                            <Skull className="h-3.5 w-3.5" />
                            Difficulté
                          </Label>
                          <Select
                            value={formData.difficulty.toString()}
                            onValueChange={(value) => setFormData({ ...formData, difficulty: parseInt(value) })}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">💀 Facile</SelectItem>
                              <SelectItem value="2">💀💀 Moyen</SelectItem>
                              <SelectItem value="3">💀💀💀 Difficile</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          required
                          rows={3}
                          placeholder="Description du challenge visible par les participants"
                          className="bg-background resize-y"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Indice (optionnel)</Label>
                        <Input
                          value={formData.hint}
                          onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                          placeholder="Un indice pour aider les participants"
                          className="bg-background"
                        />
                      </div>
                    </div>

                    <div className="border-t border-border" />

                    {/* Section: Ressources */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Upload className="h-3.5 w-3.5" />
                        Ressources & Connexion
                      </h3>
                      {/* File Upload */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Fichier joint (optionnel)
                        </Label>
                        {formData.file_url ? (
                          <div className="flex items-center gap-2 p-3 bg-background rounded-lg border">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <a 
                              href={formData.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1 text-sm text-primary hover:underline truncate"
                            >
                              {formData.file_url.split('/').pop()}
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeFile}
                              className="text-destructive hover:text-destructive flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Input
                              type="file"
                              onChange={handleFileUpload}
                              disabled={isUploading}
                              className="bg-background cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                              accept="image/*,.pdf,.zip,.pcap,.txt,.py,.js,.html,.css,.json,.xml,.csv,.doc,.docx"
                            />
                            {isUploading && (
                              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Images, PDF, ZIP, PCAP, scripts... (max 10 Mo)
                        </p>
                      </div>
                      {/* External URL */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <ExternalLink className="h-3.5 w-3.5" />
                          URL Externe (Docker/VM)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={formData.external_url}
                            onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                            placeholder="http://192.168.1.10:8080 ou https://chall.example.com"
                            className="bg-background font-mono text-sm flex-1"
                          />
                          {formData.external_url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`${formData.external_url}/api/verify`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ flag: 'TEST_CONNECTION' }),
                                  });
                                  if (response.ok) {
                                    toast({ title: "✅ API accessible", description: "L'endpoint répond correctement." });
                                  } else {
                                    toast({ title: "❌ Erreur API", description: `HTTP ${response.status}`, variant: "destructive" });
                                  }
                                } catch (error) {
                                  toast({ title: "❌ Connexion impossible", description: "Vérifiez l'URL et que le serveur est accessible.", variant: "destructive" });
                                }
                              }}
                              className="whitespace-nowrap"
                            >
                              Tester API
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Lien vers un container Docker ou une VM hébergeant le challenge
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border" />

                    {/* Section: Flag & Paramètres */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5" />
                        Flag & Paramètres
                      </h3>
                      <div className="space-y-2">
                        <Label>
                          Flag (réponse) {formData.external_url && <span className="text-muted-foreground font-normal">(optionnel si géré par l'API externe)</span>}
                        </Label>
                        <Input
                          value={formData.flag}
                          onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                          required={!formData.external_url}
                          placeholder={formData.external_url ? "Géré par l'API externe ou remplis ici" : "ISEN{...}"}
                          className="bg-background font-mono"
                        />
                        {formData.external_url && (
                          <p className="text-xs text-emerald-500">
                            ✓ Le flag peut être vérifié via l'API externe ({formData.external_url}/api/verify)
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                          <Label className="cursor-pointer mb-0">Challenge actif</Label>
                        </div>
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${formData.hide_flag_submission ? 'bg-yellow-500' : 'bg-muted-foreground'}`} />
                          <Label className="cursor-pointer mb-0">Masquer soumission de flag</Label>
                        </div>
                        <Switch
                          checked={formData.hide_flag_submission}
                          onCheckedChange={(checked) => setFormData({ ...formData, hide_flag_submission: checked })}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full font-mono gap-2" size="lg">
                      {editingChallenge ? (
                        <>
                          <Pencil className="h-4 w-4" />
                          Mettre à jour
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Créer le challenge
                        </>
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Flag</TableHead>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challenges.map((challenge) => (
                    <TableRow key={challenge.id}>
                      <TableCell className="font-mono text-xs">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(challenge.id);
                              toast({ title: "ID copié", description: challenge.id });
                            } catch {
                              // Fallback for non-HTTPS contexts
                              const textArea = document.createElement("textarea");
                              textArea.value = challenge.id;
                              document.body.appendChild(textArea);
                              textArea.select();
                              document.execCommand("copy");
                              document.body.removeChild(textArea);
                              toast({ title: "ID copié", description: challenge.id });
                            }
                          }}
                          className="text-muted-foreground hover:text-primary transition-colors cursor-pointer truncate max-w-[80px] block"
                          title={`Cliquer pour copier: ${challenge.id}`}
                        >
                          {challenge.id.slice(0, 8)}...
                        </button>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{challenge.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{challenge.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-primary">{challenge.points}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[150px] truncate">
                        {challenge.flag}
                      </TableCell>
                      <TableCell>
                        {challenge.file_url ? (
                          <a 
                            href={challenge.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline text-xs"
                          >
                            <FileText className="h-3 w-3" />
                            Fichier
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
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
                        <div className="flex items-center gap-2">
                          {sub.username}
                          {sub.is_anonymous && (
                            <Badge variant="outline" className="text-xs">Invité</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{sub.challenge_title}</TableCell>
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

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-card/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="font-mono text-4xl font-bold text-primary">{stats.totalSubmissions}</div>
                    <div className="text-sm text-muted-foreground">Total Soumissions</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="font-mono text-4xl font-bold text-green-500">{stats.correctSubmissions}</div>
                    <div className="text-sm text-muted-foreground">Flags Corrects</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="font-mono text-4xl font-bold text-blue-500">{stats.totalPlayers}</div>
                    <div className="text-sm text-muted-foreground">Joueurs Anonymes</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="font-mono text-4xl font-bold text-yellow-500">
                      {stats.totalSubmissions > 0 ? Math.round((stats.correctSubmissions / stats.totalSubmissions) * 100) : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taux de Réussite</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Solves by Challenge */}
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="font-mono">Résolutions par Challenge</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.solvesByChallenge} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                        <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Bar dataKey="solves" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="font-mono">Challenges par Catégorie</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.categoryStats}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="count"
                          nameKey="category"
                          label={({ category, count }) => `${category}: ${count}`}
                        >
                          {chartData.categoryStats.map((_, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={["#3B82F6", "#EAB308", "#8B5CF6", "#EC4899", "#F97316", "#06B6D4"][index % 6]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Options */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="font-mono">Exporter les Données</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button onClick={exportLeaderboardCSV} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exporter le Leaderboard
                  </Button>
                  <Button onClick={exportSubmissionsCSV} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exporter les Soumissions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
