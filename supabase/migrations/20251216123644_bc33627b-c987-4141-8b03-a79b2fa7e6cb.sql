-- Create a public view for submissions that excludes the submitted_flag column
CREATE VIEW public.submissions_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  challenge_id,
  user_id,
  player_id,
  is_correct,
  submitted_at
FROM public.submissions;

-- Grant access to the view
GRANT SELECT ON public.submissions_public TO anon;
GRANT SELECT ON public.submissions_public TO authenticated;

-- Drop the old permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view submissions for leaderboard" ON public.submissions;

-- Create new restrictive policy - only admins can SELECT from the actual table (to see submitted flags)
CREATE POLICY "Only admins can view submissions table directly" 
ON public.submissions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));