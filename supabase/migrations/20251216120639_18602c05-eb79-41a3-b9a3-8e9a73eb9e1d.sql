-- Add difficulty column to challenges table
ALTER TABLE public.challenges 
ADD COLUMN difficulty INTEGER NOT NULL DEFAULT 1 
CHECK (difficulty >= 1 AND difficulty <= 3);

-- Add comment for clarity
COMMENT ON COLUMN public.challenges.difficulty IS '1 = Facile, 2 = Moyen, 3 = Difficile';