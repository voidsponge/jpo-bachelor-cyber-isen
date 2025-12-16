-- Create chat messages table for admin-player communication
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  user_id UUID,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'player', 'user')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all messages"
ON public.chat_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert messages"
ON public.chat_messages FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR true);

CREATE POLICY "Players can view their own messages"
ON public.chat_messages FOR SELECT
USING (session_id = current_setting('request.headers', true)::json->>'x-session-id' OR player_id IS NOT NULL);

CREATE POLICY "Anyone can insert messages"
ON public.chat_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update messages"
ON public.chat_messages FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_events;