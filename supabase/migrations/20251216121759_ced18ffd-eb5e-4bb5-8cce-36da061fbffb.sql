-- Add is_terminal_challenge column to challenges table
ALTER TABLE public.challenges 
ADD COLUMN is_terminal_challenge BOOLEAN NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.challenges.is_terminal_challenge IS 'Si true, affiche un terminal Linux interactif pour ce challenge';