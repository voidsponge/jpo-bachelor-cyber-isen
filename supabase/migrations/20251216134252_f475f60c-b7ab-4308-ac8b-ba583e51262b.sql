-- Add external_url column to challenges table for linking to Docker containers, VMs, or external sites
ALTER TABLE public.challenges 
ADD COLUMN external_url TEXT DEFAULT NULL;

-- Add a comment to explain the column's purpose
COMMENT ON COLUMN public.challenges.external_url IS 'URL or IP address linking to external resources like Docker containers or VMs hosting the challenge environment';