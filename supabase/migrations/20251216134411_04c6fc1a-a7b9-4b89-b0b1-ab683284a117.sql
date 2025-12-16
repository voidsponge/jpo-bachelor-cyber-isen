-- Update challenges_public view to include external_url
DROP VIEW IF EXISTS public.challenges_public;

CREATE VIEW public.challenges_public AS
SELECT 
  id,
  title,
  category,
  points,
  description,
  hint,
  file_url,
  difficulty,
  is_terminal_challenge,
  is_active,
  created_at,
  updated_at,
  external_url
FROM public.challenges;