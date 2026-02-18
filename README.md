# 🚩 CTF Platform — ISEN

Plateforme de Capture The Flag (CTF) développée pour les JPO ISEN. Stack : **React + Vite + TypeScript + Tailwind CSS + Supabase**.

---

## 📚 Table des matières

1. [Architecture](#architecture)
2. [Prérequis](#prérequis)
3. [Installation locale](#installation-locale)
4. [Configuration Supabase](#configuration-supabase)
5. [Variables d'environnement](#variables-denvironnement)
6. [Déploiement sur VM](#déploiement-sur-vm)
7. [Maintenance](#maintenance)
8. [Bot Discord](#bot-discord)
9. [Challenges externes](#challenges-externes)
10. [Gestion des admins](#gestion-des-admins)

---

## Architecture

```
ctf-platform/
├── src/                        # Code source React
│   ├── pages/                  # Pages principales (Arena, Leaderboard, Admin...)
│   ├── components/             # Composants réutilisables
│   ├── contexts/               # AuthContext (gestion session)
│   └── integrations/supabase/ # Client + types Supabase (auto-générés)
├── supabase/
│   ├── functions/              # Edge Functions (verify-flag, record-external-submission)
│   └── migrations/             # Migrations SQL de la base de données
├── public/
│   └── challenges/             # Challenges externes (PHP Docker)
│       ├── button-redirect/
│       └── inspect-isen/
├── discord-bot/                # Bot Discord Python (optionnel)
└── README.md
```

**Flux utilisateur :**
```
Joueur → Arena → Ouvre un challenge → Soumet le flag
                                           ↓
                              Edge Function verify-flag
                                           ↓
                              Supabase DB (submissions)
                                           ↓
                                    Leaderboard
```

---

## Prérequis

| Outil | Version minimale | Utilité |
|-------|-----------------|---------|
| Node.js | v20+ | Runtime JS |
| npm ou bun | latest | Gestionnaire de paquets |
| Git | any | Cloner le repo |
| Compte Supabase | — | Base de données & auth |
| Nginx (VM) | any | Reverse proxy |
| Docker (optionnel) | any | Challenges externes |
| Python 3.10+ (optionnel) | — | Bot Discord |

---

## Installation locale

### 1. Cloner le dépôt

```bash
git clone <URL_DU_REPO_GITHUB>
cd <NOM_DU_PROJET>
```

### 2. Installer les dépendances

```bash
npm install
# ou avec bun :
bun install
```

### 3. Configurer les variables d'environnement

Créer un fichier `.env` à la racine du projet :

```env
VITE_SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...votre_anon_key...
VITE_SUPABASE_PROJECT_ID=votre_project_id
```

> 📌 Ces valeurs se trouvent dans votre projet Supabase → **Settings → API**

### 4. Lancer le serveur de développement

```bash
npm run dev
```

L'application est disponible sur `http://localhost:8080`

---

## Configuration Supabase

### Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → **New Project**
2. Choisir un nom, une région proche (ex: `eu-west-2`), un mot de passe DB fort
3. Attendre ~2 minutes que le projet soit prêt

### Appliquer le schéma de base de données

Le schéma complet est dans `supabase/migrations/`. Il faut exécuter toutes les migrations dans l'ordre chronologique.

**Option A — Via l'interface Supabase (SQL Editor) :**

1. Dans Supabase → **SQL Editor**
2. Ouvrir chaque fichier `.sql` dans `supabase/migrations/` dans l'ordre (du plus ancien au plus récent, selon le timestamp dans le nom du fichier)
3. Copier/coller et exécuter

**Option B — Via Supabase CLI (recommandé) :**

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier au projet
supabase link --project-ref VOTRE_PROJECT_ID

# Appliquer toutes les migrations
supabase db push
```

### Déployer les Edge Functions

Les fonctions serverless (`verify-flag` et `record-external-submission`) doivent être déployées :

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

supabase login
supabase link --project-ref VOTRE_PROJECT_ID

# Déployer toutes les fonctions
supabase functions deploy verify-flag
supabase functions deploy record-external-submission
```

> ⚠️ Ces deux fonctions ont `verify_jwt = false` dans `supabase/config.toml` — c'est intentionnel pour permettre les soumissions de joueurs non connectés.

### Configurer l'authentification

Dans Supabase → **Authentication → Settings** :

- **Site URL** : `https://votre-domaine.com` (ou `http://localhost:8080` en local)
- **Redirect URLs** : Ajouter `https://votre-domaine.com/**`
- Email confirmation : activée par défaut (recommandé de la laisser)

---

## Variables d'environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `VITE_SUPABASE_URL` | ✅ | URL de votre projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Clé `anon` publique Supabase |
| `VITE_SUPABASE_PROJECT_ID` | ✅ | ID du projet Supabase |

> 🔒 Ne jamais committer le fichier `.env` avec une `service_role` key. Le `.gitignore` est déjà configuré pour ignorer `.env`.

---

## Déploiement sur VM

### Prérequis VM

```bash
# Mise à jour système (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Installer Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier
node --version  # doit afficher v20.x.x
npm --version

# Installer Git
sudo apt install -y git

# Installer Nginx
sudo apt install -y nginx
```

### Cloner et builder le projet

```bash
# Cloner le repo
git clone <URL_DU_REPO_GITHUB> /var/www/ctf
cd /var/www/ctf

# Créer le fichier .env
nano .env
# → Coller les variables d'environnement (voir section ci-dessus)

# Installer les dépendances
npm ci

# Builder pour la production
npm run build
```

Le dossier `dist/` contient les fichiers statiques à servir.

### Configurer Nginx

```bash
sudo nano /etc/nginx/sites-available/ctf
```

Coller la configuration suivante :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;  # ou l'IP de la VM

    root /var/www/ctf/dist;
    index index.html;

    # SPA fallback (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache sur les assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/ctf /etc/nginx/sites-enabled/

# Vérifier la config
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### HTTPS avec Certbot (recommandé)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

Certbot configure automatiquement le renouvellement du certificat.

---

## Maintenance

### Mettre à jour le site (après un push GitHub)

```bash
cd /var/www/ctf

# Récupérer les dernières modifications
git pull origin main

# Réinstaller les dépendances si package.json a changé
npm ci

# Rebuilder
npm run build

# Pas besoin de redémarrer Nginx car les fichiers sont statiques
```

> 💡 **Astuce** : Créer un script de déploiement automatique :

```bash
# /var/www/ctf/deploy.sh
#!/bin/bash
set -e
echo "🔄 Déploiement en cours..."
cd /var/www/ctf
git pull origin main
npm ci
npm run build
echo "✅ Déploiement terminé !"
```

```bash
chmod +x /var/www/ctf/deploy.sh
# Utilisation :
./deploy.sh
```

### Mettre à jour le schéma de base de données

Après une migration ajoutée dans `supabase/migrations/` :

```bash
# Via Supabase CLI
supabase db push

# Ou manuellement via SQL Editor en copiant le contenu du nouveau fichier .sql
```

### Mettre à jour les Edge Functions

```bash
supabase functions deploy verify-flag
supabase functions deploy record-external-submission
```

### Logs et monitoring

```bash
# Logs Nginx (accès)
sudo tail -f /var/log/nginx/access.log

# Logs Nginx (erreurs)
sudo tail -f /var/log/nginx/error.log

# Statut Nginx
sudo systemctl status nginx
```

Les logs des Edge Functions sont accessibles dans **Supabase → Edge Functions → Logs**.

### Sauvegardes

Supabase propose des backups automatiques quotidiens sur les plans payants.  
Pour un backup manuel de la DB :

```bash
# Via Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d).sql --linked
```

---

## Bot Discord

Le bot est optionnel. Il permet aux joueurs de récupérer un flag via Discord.

### Installation

```bash
cd discord-bot
pip install -r requirements.txt
```

### Configuration

Éditer `discord-bot/bot.py` et `discord-bot/ui_components.py` :

```python
# bot.py
TOKEN = "TON_TOKEN_DISCORD"
WELCOME_CHANNEL_ID = 123456789   # ID du salon de bienvenue
ROLE_ID = 123456789              # ID du rôle à attribuer
CTF_CHANNEL_ID = 123456789       # ID du salon CTF

# ui_components.py
CHALLENGE_ID = "UUID_DU_CHALLENGE_DISCORD"  # Récupérer depuis le panel Admin
```

### Lancer le bot

```bash
python3 discord-bot/bot.py
```

Pour un lancement en production (service systemd) :

```bash
sudo nano /etc/systemd/system/ctf-bot.service
```

```ini
[Unit]
Description=CTF Discord Bot
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ctf/discord-bot
ExecStart=/usr/bin/python3 bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ctf-bot
sudo systemctl start ctf-bot
sudo systemctl status ctf-bot
```

---

## Challenges externes

Les challenges web externes (PHP) se lancent via Docker.

### Button Redirect

```bash
cd public/challenges/button-redirect
docker build -t ctf-button-redirect .
docker run --rm -p 3378:3378 ctf-button-redirect
```

### Inspect ISEN

```bash
cd public/challenges/inspect-isen
docker build -t ctf-inspect-isen .
docker run --rm -p 3379:3378 ctf-inspect-isen
```

### Configurer un challenge externe dans l'admin

1. Créer le challenge dans le **panel Admin** du site
2. Récupérer l'**UUID** du challenge (visible dans l'admin)
3. Dans le champ **URL externe**, mettre :
   ```
   http://IP_DE_LA_VM:3378/?challengeId=UUID_DU_CHALLENGE
   ```
4. La plateforme transmet automatiquement `sessionId` et `pseudo` au challenge

> ⚠️ Si la validation se fait entièrement dans le challenge externe (sans soumettre le flag sur la plateforme), activer **"Masquer soumission de flag"** dans l'admin.

---

## Gestion des admins

### Donner le rôle admin à un utilisateur

L'utilisateur doit d'abord **créer un compte** sur la plateforme, puis :

**Via Supabase SQL Editor :**

```sql
-- Trouver l'user_id de l'utilisateur
SELECT id, email FROM auth.users WHERE email = 'admin@exemple.com';

-- Lui donner le rôle admin
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = 'UUID_DE_L_UTILISATEUR';
```

### Réinitialiser les scores (entre deux sessions CTF)

```sql
-- Supprimer toutes les soumissions
DELETE FROM public.submissions;

-- Supprimer tous les joueurs anonymes
DELETE FROM public.players;
```

> ⚠️ Ces opérations sont irréversibles. Faire un backup avant.

---

## 🆘 Problèmes fréquents

| Problème | Cause probable | Solution |
|----------|---------------|----------|
| Page blanche après build | Variable `.env` manquante | Vérifier que `.env` est présent et correct |
| Challenges n'apparaissent pas | Vue `challenges_public` obsolète | Relancer les migrations |
| Flag non accepté | Edge function non déployée | `supabase functions deploy verify-flag` |
| 404 sur les routes React | Nginx mal configuré | Vérifier le bloc `try_files $uri /index.html` |
| Erreur CORS | URL Supabase incorrecte | Vérifier `VITE_SUPABASE_URL` dans `.env` |
| Joueur ne voit pas ses points | Score calculé via `submissions` | Vérifier que `is_correct = true` en DB |
