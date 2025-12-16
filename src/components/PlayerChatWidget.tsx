import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Bot, User } from 'lucide-react';

interface ChatMessage {
  id: string;
  session_id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

interface PlayerChatWidgetProps {
  sessionId: string;
  playerId?: string;
}

const PlayerChatWidget: React.FC<PlayerChatWidgetProps> = ({ sessionId, playerId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    
    // Count unread admin messages
    const unread = (data || []).filter(m => m.sender_type === 'admin' && !isOpen).length;
    if (!isOpen) {
      setUnreadCount(unread);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`player-chat-${sessionId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMsg]);
          
          // Increment unread if chat is closed and message is from admin
          if (!isOpen && newMsg.sender_type === 'admin') {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      // Scroll to bottom
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [isOpen, messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        session_id: sessionId,
        player_id: playerId || null,
        sender_type: 'player',
        message: newMessage.trim()
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg shadow-primary/25"
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive"
              >
                {unreadCount}
              </Badge>
            )}
          </>
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80 rounded-lg border border-primary/30 bg-card shadow-xl shadow-primary/10 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-border bg-primary/10">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-medium">Support CTF</span>
              <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                En ligne
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="h-64 p-3" ref={scrollRef}>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Besoin d'aide ? Les admins sont là pour vous !
                  </p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.sender_type === 'player' || msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender_type === 'admin' && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Bot className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.sender_type === 'player' || msg.sender_type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <span className={`text-xs ${msg.sender_type === 'player' || msg.sender_type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    {(msg.sender_type === 'player' || msg.sender_type === 'user') && (
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Votre message..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={sending}
              className="flex-1 text-sm"
            />
            <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default PlayerChatWidget;
