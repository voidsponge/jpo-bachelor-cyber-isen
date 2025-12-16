-- Table for anonymous players with temporary pseudo
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  pseudo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Anyone can view players (for leaderboard)
CREATE POLICY "Anyone can view players" ON public.players FOR SELECT USING (true);

-- Anyone can insert players (for anonymous registration)
CREATE POLICY "Anyone can insert players" ON public.players FOR INSERT WITH CHECK (true);

-- Add player_id to submissions (nullable, for anonymous players)
ALTER TABLE public.submissions ADD COLUMN player_id UUID REFERENCES public.players(id);

-- Make user_id nullable (for anonymous submissions)
ALTER TABLE public.submissions ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint: must have either user_id or player_id
ALTER TABLE public.submissions ADD CONSTRAINT check_user_or_player 
  CHECK (user_id IS NOT NULL OR player_id IS NOT NULL);

-- Update submissions RLS to allow anonymous submissions
DROP POLICY IF EXISTS "Authenticated users can submit" ON public.submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.submissions;

-- Allow anyone to insert submissions
CREATE POLICY "Anyone can submit" ON public.submissions FOR INSERT WITH CHECK (true);

-- Allow viewing submissions (for leaderboard)
CREATE POLICY "Anyone can view submissions for leaderboard" ON public.submissions FOR SELECT USING (true);

-- Function to get player score (for anonymous players)
CREATE OR REPLACE FUNCTION public.get_player_score(_player_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(c.points), 0)::INTEGER
  FROM public.submissions s
  JOIN public.challenges c ON s.challenge_id = c.id
  WHERE s.player_id = _player_id AND s.is_correct = true
$$;