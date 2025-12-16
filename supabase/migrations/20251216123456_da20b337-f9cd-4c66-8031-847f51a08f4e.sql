-- Recreate the view with SECURITY INVOKER (default, but explicit is better)
DROP VIEW IF EXISTS public.challenges_public;

CREATE VIEW public.challenges_public 
WITH (security_invoker = true)
AS
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