-- Allow admins to delete submissions for CTF reset
CREATE POLICY "Admins can delete submissions"
ON public.submissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete players for CTF reset
CREATE POLICY "Admins can delete players"
ON public.players
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));