-- Drop the admin-only policy
DROP POLICY IF EXISTS "Only admins can view challenges table directly" ON public.challenges;

-- Restore public access to active challenges (view will filter out flag column)
CREATE POLICY "Anyone can view active challenges" 
ON public.challenges 
FOR SELECT 
USING ((is_active = true) OR has_role(auth.uid(), 'admin'::app_role));