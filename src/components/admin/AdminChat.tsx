import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  session_id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

interface AdminChatProps {
  sessionId: string;
  playerId: string | null;
  playerName: string;
}

const AdminChat: React.FC<AdminChatProps> = ({ sessionId, playerId, playerName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        session_id: sessionId,
        player_id: playerId,
        sender_type: 'admin',
        message: newMessage.trim()
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className="border border-border rounded-lg bg-background/50">
      <div className="p-3 border-b border-border bg-primary/5">
        <h4 className="font-medium flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Chat avec {playerName}
        </h4>
      </div>

      <ScrollArea className="h-[200px] p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              Aucun message. Commencez la conversation !
            </p>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender_type !== 'admin' && (
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="h-3 w-3" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.sender_type === 'admin'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <span className={`text-xs ${msg.sender_type === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
                {msg.sender_type === 'admin' && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Bot className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Envoyer un message..."
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          disabled={sending}
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AdminChat;
