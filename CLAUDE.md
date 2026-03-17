# 📖 Documentation Claude — CTF Platform ISEN

## Vue d'ensemble

Plateforme de **Capture The Flag (CTF)** pour les **Journées Portes Ouvertes de l'ISEN Méditerranée** (école d'ingénieurs). Le but : promouvoir le **Bachelor Cybersécurité** en faisant participer les visiteurs à des challenges de sécurité informatique.

**Stack** : React 18 + Vite + TypeScript + Tailwind CSS + Supabase (Lovable Cloud)  
**URL publiée** : https://jpo-bachelor-cyber-isen.lovable.app  
**Langue de l'UI** : Français

---

## 🏗️ Architecture

### Pages & Routes

| Route | Fichier | Description | Auth requise |
|-------|---------|-------------|--------------|
| `/` | `src/pages/Index.tsx` | Landing page marketing avec Matrix Rain, hero ISEN CYBERCTF, section formation Bachelor Cyber | Non |
| `/auth` | `src/pages/Auth.tsx` | Login uniquement (email + mot de passe). Pas de signup dans cette page — inscription via pseudo anonyme ou compte admin | Non |
| `/arena` | `src/pages/Arena.tsx` | Grille des challenges CTF. Stats (points, progression), filtres par catégorie. Cartes interactives avec flip animation quand résolues | Non (joueurs anonymes supportés) |
| `/leaderboard` | `src/pages/Leaderboard.tsx` | Classement live (realtime via Supabase). Affiche joueurs authentifiés ET anonymes. MAJ automatique sur nouvelles soumissions | Non |
| `/spectator` | `src/pages/Spectator.tsx` | Mode spectateur plein écran pour projection. Matrix Rain + classement live + notifications de résolution + "Breaking News" quand le leader change. Son activable | Non |
| `/admin` | `src/pages/Admin.tsx` | Panel d'administration (1232 lignes). CRUD challenges, visualisation submissions, stats (graphiques recharts), mode Troll, heatmap, session replay | Oui (rôle admin) |
| `/settings` | `src/pages/Settings.tsx` | Changement de mot de passe pour utilisateurs authentifiés | Oui |

### Composants clés

| Composant | Rôle |
|-----------|------|
| `Navbar.tsx` | Barre de navigation fixe. Logo ISEN + liens (Accueil, Arena, Classement). Menu dropdown si connecté (Paramètres, Panel Admin si admin, Déconnexion) |
| `ChallengeCard.tsx` | Carte de challenge avec animation 3D flip. Face avant : catégorie, titre, points, difficulté (skulls). Face arrière dorée quand résolu (trophée + "Flag capturé !"). Particules au hover |
| `ChallengeModal.tsx` | Modal de détail challenge. Soumission de flag, hint, fichier à télécharger, lien externe, terminal intégré. Confetti 🎉 à la résolution |
| `LinuxTerminal.tsx` | Terminal Linux simulé dans le navigateur pour challenges de type terminal |
| `MatrixRain.tsx` | Background "code matrix" en canvas, utilisé sur la homepage et le mode spectateur |
| `TrollOverlay.tsx` | Overlay fullscreen contrôlé en temps réel par l'admin (broadcast Supabase). Affiche GIF/texte sur les écrans de tous les joueurs |
| `TrollModePanel.tsx` | Interface admin pour envoyer des overlays troll (GIFs preset, texte custom, couleurs, durée) |
| `BreakingNewsOverlay.tsx` | Bandeau "Breaking News" style TV quand le leader du classement change (mode spectateur) |
| `CircuitBackground.tsx` | Background décoratif avec motif de circuit imprimé |

---

## 🗄️ Base de données (Supabase)

### Tables

| Table | Description |
|-------|-------------|
| `challenges` | Challenges CTF. Colonnes : title, category (enum), points, description, hint, flag (secret), difficulty (1-3), is_active, is_terminal_challenge, external_url, docker_image, docker_ports, file_url, hide_flag_submission |
| `players` | Joueurs anonymes (pas de compte). Identifiés par session_id + pseudo |
| `profiles` | Profils des utilisateurs authentifiés. Colonnes : user_id, username, avatar_url |
| `submissions` | Soumissions de flags. Liées à un challenge + user_id OU player_id. Colonnes : submitted_flag, is_correct, submitted_at |
| `user_roles` | Rôles utilisateurs. Enum `app_role` : "admin" \| "participant" |
| `chat_messages` | Messages de chat (session_id, player_id, sender_type) |
| `player_events` | Tracking d'événements joueurs (event_type, event_data, page_url) |

### Vues (sécurité)

| Vue | Rôle |
|-----|------|
| `challenges_public` | Vue publique des challenges. **Exclut la colonne `flag`** pour empêcher les joueurs de voir les réponses |
| `submissions_public` | Vue publique des soumissions. **Exclut la colonne `submitted_flag`** |

### Enums

- `challenge_category` : Web, OSINT, Crypto, Stegano, Logic, Forensics, QR CODE
- `app_role` : admin, participant

### Fonctions RPC

- `get_player_score(_player_id)` → score total d'un joueur anonyme
- `get_user_score(_user_id)` → score total d'un utilisateur authentifié
- `has_role(_user_id, _role)` → vérifie si un utilisateur a un rôle (security definer, évite récursion RLS)

---

## 🔐 Authentification & Joueurs

### Deux modes de jeu

1. **Joueurs authentifiés** : Email + mot de passe via Supabase Auth. Ont un profil (`profiles`) et potentiellement un rôle admin (`user_roles`).
2. **Joueurs anonymes** : Entrent un pseudo, reçoivent un `session_id` stocké dans `sessionStorage`. Créés dans la table `players`. Pas de compte, pas de persistance entre sessions.

### AuthContext (`src/contexts/AuthContext.tsx`)

Fournit : `user`, `session`, `isLoading`, `isAdmin`, `username`, `signUp`, `signIn`, `signOut`.  
Le rôle admin est vérifié côté client via la table `user_roles` (ET côté serveur via `has_role()` pour les opérations sensibles).

---

## ⚡ Edge Functions (Backend)

### `verify-flag`
- **Rôle** : Vérification de flag principal (appelé depuis le ChallengeModal)
- **Logique** :
  1. Accepte utilisateurs authentifiés (JWT) OU joueurs anonymes (sessionId + pseudo)
  2. Vérifie si déjà résolu
  3. Modes de vérification :
     - **Docker** : Appelle une API Docker externe pour valider le flag du conteneur du joueur
     - **External URL** : Appelle `{external_url}/api/verify`
     - **Terminal** : Accepte le pattern `ISEN{L1NUX_M4ST3R_XXXXXXXX}`
     - **Standard** : Compare avec `challenge.flag` (case insensitive)
  4. Enregistre la soumission dans `submissions`

### `record-external-submission`
- **Rôle** : Enregistrement de flags depuis des challenges externes (pages PHP hébergées séparément)
- **Logique** : Similaire mais accepte tout flag commençant par `FLAG_ISEN` ou `ISEN{` comme valide (les challenges externes valident eux-mêmes)

---

## 🎮 Challenges externes (Docker)

Deux challenges PHP hébergés dans des conteneurs Docker séparés :

### `button-redirect` (Port 3378)
- Page noire avec un bouton "JE VEUX LE FLAG" désactivé (`disabled="true"`)
- Solution : Inspecter l'élément, supprimer l'attribut `disabled`, cliquer → redirige vers page avec le flag
- Flag dynamique au format `FLAG_ISEN{Animal_Adjectif}`

### `inspect-isen` (Port 3379)
- Reproduction de la page ISEN avec flag caché en commentaire HTML
- Solution : Inspecter le code source de la page
- Flag dynamique généré par `flag-gen.py` au démarrage du conteneur

Les challenges externes communiquent avec la plateforme via l'edge function `record-external-submission` en passant `challengeId`, `sessionId`, et `pseudo` en query params.

---

## 🎨 Design System

### Thème
- **Couleur primaire** : Rouge ISEN (`hsl(0 84% 50%)`) — utilisé partout comme accent
- **Background** : Noir profond (`hsl(0 0% 8%)`)
- **Police mono** : JetBrains Mono (importée dans index.css)
- **Esthétique** : Hacker/cyberpunk — Matrix rain, terminal vert→rouge, skulls pour difficulté, effets de glow

### Tokens CSS personnalisés
- `--terminal-green` : couleur primaire rouge ISEN (nom hérité, a été changé du vert au rouge)
- `--terminal-glow` : effet de lueur rouge
- `--cyber-purple`, `--alert-red` : accents

### Animations
- Flip 3D sur les ChallengeCards (solved → face dorée avec trophée)
- Particules au hover sur les cartes
- Confetti (canvas-confetti) à la résolution de challenge
- Matrix Rain (canvas) sur homepage et spectateur
- Breaking News (slide-in) sur le spectateur

---

## 🤡 Mode Troll (Feature admin)

L'admin peut envoyer en temps réel des overlays fullscreen sur les écrans de TOUS les joueurs via **Supabase Broadcast** (channel `troll-overlay`). Options :
- GIFs preset (Rickroll, Hacker, Mind Blown, etc.)
- URL d'image custom
- Texte personnalisé (taille, couleur)
- Durée configurable
- Bouton de fermeture optionnel

Le `TrollOverlay.tsx` est inclus sur toutes les pages principales (Arena, Index).

---

## 📊 Panel Admin (détail)

6 onglets dans `/admin` :
1. **Challenges** : CRUD complet (créer, éditer, supprimer, activer/désactiver). Upload de fichiers. Configuration URL externe, Docker image/ports
2. **Submissions** : Liste de toutes les soumissions avec filtrage. Export possible
3. **Stats** : Graphiques recharts (PieChart catégories, BarChart solves par challenge)
4. **Troll** : Panel TrollModePanel pour envoyer des overlays
5. **Heatmap** : Visualisation temporelle des résolutions
6. **Replay** : Session replay des joueurs

L'admin peut aussi **réinitialiser les scores** (supprime submissions + players) pour relancer un CTF propre.

---

## 🔄 Realtime

- **Leaderboard** : Souscription aux `INSERT` sur `submissions` → refresh auto du classement
- **Spectateur** : Même souscription + notifications toast + "Breaking News" si changement de leader
- **Troll Overlay** : Broadcast Supabase (pas de persistence DB)

---

## 📁 Structure des fichiers clés

```
src/
├── pages/
│   ├── Index.tsx          # Landing page marketing
│   ├── Auth.tsx           # Login (email/password)
│   ├── Arena.tsx          # Grille challenges + stats
│   ├── Leaderboard.tsx    # Classement live
│   ├── Spectator.tsx      # Mode projection plein écran
│   ├── Admin.tsx          # Panel admin complet (1232 lignes)
│   ├── Settings.tsx       # Changement mot de passe
│   └── NotFound.tsx       # 404
├── components/
│   ├── Navbar.tsx         # Navigation
│   ├── ChallengeCard.tsx  # Carte challenge (flip 3D)
│   ├── ChallengeModal.tsx # Modal soumission flag
│   ├── LinuxTerminal.tsx  # Terminal simulé
│   ├── MatrixRain.tsx     # Effet Matrix (canvas)
│   ├── TrollOverlay.tsx   # Overlay troll (broadcast)
│   ├── TrollModePanel.tsx # UI admin pour troll
│   ├── BreakingNewsOverlay.tsx
│   └── admin/             # Composants admin (Heatmap, SessionReplay)
├── contexts/
│   └── AuthContext.tsx     # Auth state + rôle admin
└── integrations/supabase/
    ├── client.ts          # Client Supabase (auto-généré)
    └── types.ts           # Types DB (auto-généré)

supabase/functions/
├── verify-flag/index.ts              # Vérification de flag (principal)
└── record-external-submission/index.ts # Soumission depuis challenges Docker

public/challenges/
├── button-redirect/   # Challenge PHP Docker (bouton disabled)
└── inspect-isen/      # Challenge PHP Docker (flag en commentaire HTML)

discord-bot/           # Bot Discord optionnel (Python)
```

---

## ⚠️ Points d'attention pour les modifications

1. **Ne jamais modifier** : `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `supabase/config.toml`, `.env` — fichiers auto-générés
2. **Admin.tsx fait 1232 lignes** — candidat au refactoring si on y touche beaucoup
3. **Vues publiques** (`challenges_public`, `submissions_public`) : la sécurité repose sur ces vues pour ne pas exposer les flags aux joueurs
4. **Deux systèmes de joueurs** : authentifiés (user_id) vs anonymes (player_id/session_id) — les deux doivent être gérés partout
5. **Challenges Docker** : hébergés séparément, communiquent via edge functions. Les flags sont dynamiques (générés au démarrage du conteneur)
6. **Le thème est rouge ISEN** (pas vert malgré les noms de variables comme `--terminal-green`)
