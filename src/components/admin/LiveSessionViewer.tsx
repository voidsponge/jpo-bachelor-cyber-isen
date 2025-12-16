import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, MessageCircle, Clock, MapPin, Activity } from 'lucide-react';
import AdminChat from './AdminChat';

interface LivePlayer {
  session_id: string;
  player_id: string | null;
  user_id: string | null;
  name: string;
  current_page: string;
  last_activity: string;
  is_online: boolean;
  events: PlayerEvent[];
}

interface PlayerEvent {
  id: string;
  event_type: string;
  page_url: string | null;
  event_data: Record<string, unknown>;
  created_at: string;
  player_id: string | null;
  user_id: string | null;
  session_id: string;
}

const LiveSessionViewer: React.FC = () => {
  const [livePlayers, setLivePlayers] = useState<LivePlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<LivePlayer | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLivePlayers = async () => {
    try {
      // Get recent events (last 5 minutes = online)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: events, error } = await supabase
        .from('player_events')
        .select('*')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by session_id
      const sessionMap = new Map<string, PlayerEvent[]>();
      (events as PlayerEvent[] || []).forEach(event => {
        const existing = sessionMap.get(event.session_id) || [];
        sessionMap.set(event.session_id, [...existing, event]);
      });

      // Get player/user names
      const playerIds = [...new Set((events || []).filter(e => e.player_id).map(e => e.player_id as string))];
      const userIds = [...new Set((events || []).filter(e => e.user_id).map(e => e.user_id as string))];

      const [playersRes, profilesRes] = await Promise.all([
        playerIds.length > 0 
          ? supabase.from('players').select('id, pseudo').in('id', playerIds)
          : Promise.resolve({ data: [] }),
        userIds.length > 0
          ? supabase.from('profiles').select('user_id, username').in('user_id', userIds)
          : Promise.resolve({ data: [] })
      ]);

      const playerNames = new Map<string, string>(
        (playersRes.data || []).map(p => [p.id, p.pseudo] as [string, string])
      );
      const userNames = new Map<string, string>(
        (profilesRes.data || []).map(p => [p.user_id, p.username] as [string, string])
      );

      // Build live players list
      const players: LivePlayer[] = [];
      sessionMap.forEach((sessionEvents, sessionId) => {
        const latestEvent = sessionEvents[0];
        const playerId = latestEvent.player_id;
        const userId = latestEvent.user_id;
        
        let name = 'Anonyme';
        if (playerId && playerNames.has(playerId)) {
          name = playerNames.get(playerId) || 'Anonyme';
        } else if (userId && userNames.has(userId)) {
          name = userNames.get(userId) || 'Anonyme';
        }

        const lastActivityTime = new Date(latestEvent.created_at);
        const isOnline = Date.now() - lastActivityTime.getTime() < 2 * 60 * 1000; // 2 min

        players.push({
          session_id: sessionId,
          player_id: playerId,
          user_id: userId,
          name,
          current_page: latestEvent.page_url || '/',
          last_activity: latestEvent.created_at,
          is_online: isOnline,
          events: sessionEvents
        });
      });

      // Sort by last activity
      players.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());
      
      setLivePlayers(players);
    } catch (error) {
      console.error('Error fetching live players:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePlayers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('live-sessions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'player_events' },
        () => {
          fetchLivePlayers();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchLivePlayers, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getPageLabel = (path: string) => {
    const labels: Record<string, string> = {
      '/': 'Accueil',
      '/arena': 'Arena',
      '/leaderboard': 'Classement',
      '/auth': 'Connexion',
      '/settings': 'Paramètres'
    };
    return labels[path] || path;
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'page_view': return <MapPin className="h-3 w-3" />;
      case 'challenge_open': return <Eye className="h-3 w-3" />;
      case 'flag_submit': return <Activity className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Liste des joueurs en ligne */}
      <Card className="lg:col-span-1 bg-card/50 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Joueurs en ligne ({livePlayers.filter(p => p.is_online).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {livePlayers.map(player => (
                <div
                  key={player.session_id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPlayer?.session_id === player.session_id
                      ? 'border-primary bg-primary/10'
                      : 'border-border/50 hover:border-primary/50 bg-background/50'
                  }`}
                  onClick={() => setSelectedPlayer(player)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${player.is_online ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
                      <span className="font-mono font-medium">{player.name}</span>
                    </div>
                    <Badge variant={player.is_online ? 'default' : 'secondary'} className="text-xs">
                      {player.is_online ? 'En ligne' : 'Inactif'}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    {getPageLabel(player.current_page)}
                    <span className="ml-auto">{formatTime(player.last_activity)}</span>
                  </div>
                </div>
              ))}
              {livePlayers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Aucun joueur actif
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Détails et timeline */}
      <Card className="lg:col-span-2 bg-card/50 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              {selectedPlayer ? `Session: ${selectedPlayer.name}` : 'Sélectionnez un joueur'}
            </CardTitle>
            {selectedPlayer && (
              <Button
                size="sm"
                onClick={() => setShowChat(!showChat)}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                {showChat ? 'Masquer chat' : 'Ouvrir chat'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedPlayer ? (
            <div className="grid grid-cols-1 gap-4">
              {/* Timeline des événements */}
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Activité récente</h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {selectedPlayer.events.map((event) => (
                      <div key={event.id} className="flex items-start gap-2 text-sm">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary shrink-0">
                          {getEventIcon(event.event_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">
                              {event.event_type.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(event.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {event.page_url}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Chat */}
              {showChat && (
                <AdminChat
                  sessionId={selectedPlayer.session_id}
                  playerId={selectedPlayer.player_id}
                  playerName={selectedPlayer.name}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Eye className="h-12 w-12 mb-4 opacity-50" />
              <p>Sélectionnez un joueur pour voir son activité</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveSessionViewer;
