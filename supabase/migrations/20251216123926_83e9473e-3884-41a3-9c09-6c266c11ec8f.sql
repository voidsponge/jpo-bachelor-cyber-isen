-- Drop the admin-only policy for submissions
DROP POLICY IF EXISTS "Only admins can view submissions table directly" ON public.submissions;

-- Restore public access to submissions (view will filter out submitted_flag column)
CREATE POLICY "Anyone can view submissions for leaderboard" 
ON public.submissions 
FOR SELECT 
USING (true);