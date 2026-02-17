-- Recreate the challenges_public view to include hide_flag_submission
CREATE OR REPLACE VIEW public.challenges_public
WITH (security_invoker=on) AS
  SELECT 
    id, title, category, points, description, hint, file_url, 
    difficulty, is_terminal_challenge, is_active, created_at, updated_at,
    external_url, docker_image, docker_ports, hide_flag_submission
  FROM public.challenges;

NOTIFY pgrst, 'reload schema';