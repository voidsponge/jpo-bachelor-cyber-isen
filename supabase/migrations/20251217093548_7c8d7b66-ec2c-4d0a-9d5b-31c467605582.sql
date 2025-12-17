-- Add Docker container configuration to challenges
ALTER TABLE public.challenges 
ADD COLUMN docker_image TEXT,
ADD COLUMN docker_ports TEXT; -- Format: "80:8080,443:8443"

COMMENT ON COLUMN public.challenges.docker_image IS 'Docker image name to spawn for this challenge (e.g., ctf/linux-basics:latest)';
COMMENT ON COLUMN public.challenges.docker_ports IS 'Port mappings in format "host:container,host:container"';