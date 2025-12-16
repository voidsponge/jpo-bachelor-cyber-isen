-- Create enum for challenge categories
CREATE TYPE public.challenge_category AS ENUM ('Web', 'OSINT', 'Crypto', 'Stegano', 'Logic', 'Forensics');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'participant');

-- Create challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category challenge_category NOT NULL,
  points INTEGER NOT NULL DEFAULT 100,
  description TEXT NOT NULL,
  hint TEXT,
  flag TEXT NOT NULL,
  file_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'participant',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create submissions table
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  submitted_flag TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, is_correct) -- Only one correct submission per user per challenge
);

-- Enable RLS on all tables
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's total score
CREATE OR REPLACE FUNCTION public.get_user_score(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(c.points), 0)::INTEGER
  FROM public.submissions s
  JOIN public.challenges c ON s.challenge_id = c.id
  WHERE s.user_id = _user_id AND s.is_correct = true
$$;

-- RLS Policies for challenges
CREATE POLICY "Anyone can view active challenges"
  ON public.challenges FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update challenges"
  ON public.challenges FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete challenges"
  ON public.challenges FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for submissions
CREATE POLICY "Users can view their own submissions"
  ON public.submissions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can submit"
  ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  
  -- Assign participant role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'participant');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;

-- Insert default challenges (real CTF challenges!)
INSERT INTO public.challenges (title, category, points, description, hint, flag, file_url) VALUES
  ('L''envers du décor', 'Web', 100, 
   'Un bon hacker regarde toujours sous le capot. Le flag se cache peut-être plus près que tu ne le penses... Inspecte bien cette page !',
   'Clique droit > Inspecter > Cherche dans les commentaires HTML',
   'ISEN{inspect_element_master}', NULL),
  
  ('Détective numérique', 'OSINT', 150,
   'L''information est partout pour celui qui sait chercher. Quel établissement a formé les étudiants à Toulon depuis 1991 sous le nom ISEN ? Le flag est le nom complet en minuscules avec underscores.',
   'Recherche "ISEN Toulon histoire" sur Google',
   'ISEN{yncrea_mediterranee}', NULL),
  
  ('Le code de César', 'Crypto', 200,
   'Jules César utilisait ce chiffrement pour ses messages secrets. Décode ce message avec un décalage de 3 : "LVHQ{fdhvdu_flskhu_fudfnhg}"',
   'Chaque lettre est décalée de 3 positions dans l''alphabet. A→D, B→E, etc. Inverse le processus !',
   'ISEN{caesar_cipher_cracked}', NULL),
  
  ('Message caché', 'Stegano', 250,
   'Cette chaîne base64 semble innocente, mais elle cache un secret : "SVNFTntzdGVnYW5vX2lzX2Z1bn0="',
   'Base64 est un encodage, pas un chiffrement. Utilise un décodeur base64 en ligne !',
   'ISEN{stegano_is_fun}', NULL),
  
  ('Le bon mot de passe', 'Logic', 300,
   'Notre système de validation est strict : le mot de passe doit faire exactement 12 caractères ET se terminer par "!". Quel est le flag si le mot de passe valide est "ISENsecure2!" ?',
   'Le flag EST le mot de passe qui respecte les règles',
   'ISEN{ISENsecure2!}', NULL),
  
  ('Trafic suspect', 'Forensics', 500,
   'Dans ce log réseau, quelqu''un a envoyé un mot de passe en clair : "GET /login?user=admin&pass=ISEN{network_forensics_101} HTTP/1.1". Extrait le flag !',
   'Le flag est visible directement dans la requête HTTP... regarde le paramètre "pass"',
   'ISEN{network_forensics_101}', NULL);