import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Play, 
  User, 
  Clock, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Activity,
  UserX,
  Loader2
} from "lucide-react";

interface PlayerEvent {
  id: string;
  session_id: string;
  event_type: string;
  event_data: any;
  page_url: string;
  created_at: string;
}

interface PlayerSession {
  session_id: string;
  player_id: string | null;
  user_id: string | null;
  username: string;
  eventCount: number;
  firstEvent: string;
  lastEvent: string;
  isAnonymous: boolean;
}

const SessionReplay = () => {
  const [sessions, setSessions] = useState<PlayerSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [events, setEvents] = useState<PlayerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [anonymizingId, setAnonymizingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      // Get submissions to identify active sessions
      const { data: submissions } = await supabase
        .from("submissions")
        .select("user_id, player_id, submitted_at")
        .order("submitted_at", { ascending: false });

      if (!submissions) return;

      // Group by player/user
      const sessionMap = new Map<string, any>();
      
      for (const sub of submissions) {
        const key = sub.user_id || sub.player_id;
        if (!key) continue;
        
        if (!sessionMap.has(key)) {
          sessionMap.set(key, {
            id: key,
            user_id: sub.user_id,
            player_id: sub.player_id,
            submissions: [],
          });
        }
        sessionMap.get(key).submissions.push(sub);
      }

      // Get usernames
      const userIds = [...sessionMap.values()].filter(s => s.user_id).map(s => s.user_id);
      const playerIds = [...sessionMap.values()].filter(s => s.player_id).map(s => s.player_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

      const { data: players } = await supabase
        .from("players")
        .select("id, pseudo")
        .in("id", playerIds.length > 0 ? playerIds : ['00000000-0000-0000-0000-000000000000']);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
      const playerMap = new Map(players?.map(p => [p.id, p.pseudo]) || []);

      const sessionList: PlayerSession[] = [...sessionMap.values()].map(s => ({
        session_id: s.id,
        player_id: s.player_id,
        user_id: s.user_id,
        username: s.user_id ? (profileMap.get(s.user_id) || "Inconnu") : (playerMap.get(s.player_id) || "Anonyme"),
        eventCount: s.submissions.length,
        firstEvent: s.submissions[s.submissions.length - 1]?.submitted_at,
        lastEvent: s.submissions[0]?.submitted_at,
        isAnonymous: !s.user_id,
      }));

      setSessions(sessionList);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessionEvents = async (sessionId: string) => {
    setIsLoadingEvents(true);
    try {
      const session = sessions.find(s => s.session_id === sessionId);
      if (!session) return;

      // Get submissions for this session as events
      const query = session.user_id 
        ? supabase.from("submissions").select("*").eq("user_id", session.user_id)
        : supabase.from("submissions").select("*").eq("player_id", session.player_id);

      const { data: submissions } = await query.order("submitted_at", { ascending: true });

      // Get challenge titles
      const { data: challenges } = await supabase
        .from("challenges")
        .select("id, title, points");

      const challengeMap = new Map(challenges?.map(c => [c.id, c]) || []);

      const eventList: PlayerEvent[] = (submissions || []).map(sub => ({
        id: sub.id,
        session_id: sessionId,
        event_type: sub.is_correct ? "FLAG_CORRECT" : "FLAG_INCORRECT",
        event_data: {
          challenge: challengeMap.get(sub.challenge_id),
          submitted_flag: sub.submitted_flag,
        },
        page_url: "/arena",
        created_at: sub.submitted_at,
      }));

      setEvents(eventList);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSession(sessionId);
    fetchSessionEvents(sessionId);
  };

  const handleAnonymize = async (session: PlayerSession) => {
    const id = session.player_id || session.user_id;
    if (!id) return;
    
    setAnonymizingId(id);
    try {
      const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newPseudo = `Joueur_${randomId}`;
      
      if (session.isAnonymous && session.player_id) {
        // Anonymize player pseudo
        const { error } = await supabase
          .from("players")
          .update({ pseudo: newPseudo })
          .eq("id", session.player_id);
        
        if (error) throw error;
      } else if (session.user_id) {
        // Anonymize user profile
        const { error } = await supabase
          .from("profiles")
          .update({ username: newPseudo })
          .eq("user_id", session.user_id);
        
        if (error) throw error;
      }
      
      toast({
        title: "Pseudo anonymisé",
        description: `${session.username} → ${newPseudo}`,
        className: "bg-primary/20 border-primary",
      });
      
      // Refresh sessions
      fetchSessions();
    } catch (error) {
      console.error("Error anonymizing:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'anonymiser ce pseudo",
        variant: "destructive",
      });
    } finally {
      setAnonymizingId(null);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "FLAG_CORRECT": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FLAG_INCORRECT": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Session List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="font-mono text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Sessions ({sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session.session_id} className="flex gap-2 items-stretch">
                  <Button
                    variant={selectedSession === session.session_id ? "default" : "outline"}
                    className="flex-1 justify-start h-auto py-3"
                    onClick={() => handleSelectSession(session.session_id)}
                  >
                    <div className="flex flex-col items-start gap-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{session.username}</span>
                        {session.isAnonymous && (
                          <Badge variant="secondary" className="text-xs">Anon</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(session.lastEvent)}
                        <span>•</span>
                        <FileText className="h-3 w-3" />
                        {session.eventCount} soumissions
                      </div>
                    </div>
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-auto px-2 border-destructive/50 hover:bg-destructive/20 hover:border-destructive"
                        disabled={anonymizingId === (session.player_id || session.user_id)}
                      >
                        {anonymizingId === (session.player_id || session.user_id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserX className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-mono">Anonymiser ce joueur ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Le pseudo <span className="font-mono font-bold text-foreground">"{session.username}"</span> sera 
                          remplacé par un identifiant aléatoire (ex: Joueur_X4F2K9).
                          <br /><br />
                          Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleAnonymize(session)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Anonymiser
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}

              {sessions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Aucune session trouvée
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Event Timeline */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-mono text-lg flex items-center gap-2">
            <Play className="h-5 w-5" />
            Timeline des événements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedSession ? (
            isLoadingEvents ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                  <div className="space-y-4">
                    {events.map((event, index) => (
                      <div key={event.id} className="flex gap-4 relative">
                        {/* Timeline dot */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 ${
                          event.event_type === "FLAG_CORRECT" 
                            ? "bg-green-500/20 border-2 border-green-500" 
                            : "bg-red-500/20 border-2 border-red-500"
                        }`}>
                          {getEventIcon(event.event_type)}
                        </div>

                        {/* Event content */}
                        <div className="flex-1 pb-4">
                          <div className="bg-card border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant={event.event_type === "FLAG_CORRECT" ? "default" : "destructive"}>
                                {event.event_type === "FLAG_CORRECT" ? "✓ Flag correct" : "✗ Flag incorrect"}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatTime(event.created_at)}
                              </span>
                            </div>
                            
                            {event.event_data?.challenge && (
                              <div className="mt-2 space-y-1">
                                <p className="font-mono font-bold text-foreground">
                                  {event.event_data.challenge.title}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {event.event_data.challenge.points} points
                                </p>
                                {event.event_data.submitted_flag && (
                                  <p className="text-xs font-mono bg-muted/50 p-2 rounded mt-2 break-all">
                                    Flag soumis: {event.event_data.submitted_flag}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {events.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Aucun événement pour cette session
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Play className="h-12 w-12 mb-4 opacity-50" />
              <p>Sélectionnez une session pour voir la timeline</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionReplay;