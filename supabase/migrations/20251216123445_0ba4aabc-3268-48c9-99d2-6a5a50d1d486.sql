-- Create a public view that excludes the flag column
CREATE OR REPLACE VIEW public.challenges_public AS
SELECT 
  id,
  title,
  description,
  category,
  points,
  difficulty,
  hint,
  file_url,
  is_active,
  is_terminal_challenge,
  created_at,
  updated_at
FROM public.challenges;

-- Grant access to the view
GRANT SELECT ON public.challenges_public TO anon;
GRANT SELECT ON public.challenges_public TO authenticated;

-- Drop the old permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view active challenges" ON public.challenges;

-- Create new restrictive policy - only admins can SELECT from the actual table (to see flags)
CREATE POLICY "Only admins can view challenges table directly" 
ON public.challenges 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));