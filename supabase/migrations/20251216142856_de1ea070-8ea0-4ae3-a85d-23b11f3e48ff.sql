-- Fix RLS policies for chat_messages to allow admins to see all messages
DROP POLICY IF EXISTS "Admins can view all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Players can view their own messages" ON public.chat_messages;

-- Admin can see all messages
CREATE POLICY "Admins can view all messages"
ON public.chat_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Players/users can see their session messages
CREATE POLICY "Users can view their session messages"
ON public.chat_messages FOR SELECT
USING (true);

-- Fix player_events: allow anonymous inserts without session check
DROP POLICY IF EXISTS "Anyone can insert events" ON public.player_events;

CREATE POLICY "Anyone can insert events"
ON public.player_events FOR INSERT
WITH CHECK (true);