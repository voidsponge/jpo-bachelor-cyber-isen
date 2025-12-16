-- Create table for tracking player session events
CREATE TABLE public.player_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (for tracking)
CREATE POLICY "Anyone can insert events" ON public.player_events
FOR INSERT WITH CHECK (true);

-- Only admins can view events
CREATE POLICY "Admins can view events" ON public.player_events
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete events (for cleanup)
CREATE POLICY "Admins can delete events" ON public.player_events
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_player_events_session ON public.player_events(session_id);
CREATE INDEX idx_player_events_created ON public.player_events(created_at DESC);