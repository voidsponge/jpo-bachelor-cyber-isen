-- Allow admins to anonymize/update usernames

-- Players: admins can update any player pseudo
CREATE POLICY "Admins can update players"
ON public.players
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Profiles: admins can update any profile username
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
