# 🚩 CTF Platform — ISEN

Plateforme de Capture The Flag (CTF) pour les JPO ISEN. Stack : React + Vite + TypeScript + Supabase.

---

## 📚 Table des matières

1. [Prérequis](#prérequis)
2. [Installation sur la VM](#installation-sur-la-vm)
3. [Configuration Supabase](#configuration-supabase)
4. [Mettre à jour le site](#mettre-à-jour-le-site)
5. [Bot Discord](#bot-discord)
6. [Challenges externes](#challenges-externes)
7. [Gestion des admins](#gestion-des-admins)
8. [Problèmes fréquents](#problèmes-fréquents)

---

## Prérequis

- Node.js **v20+**
- Git
- Nginx
- Un projet Supabase (voir section dédiée)

---

## Installation sur la VM

### 1. Installer les dépendances système

```bash
sudo apt update && sudo apt upgrade -y

# Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx
```

### 2. Cloner le repo et configurer

```bash
git clone <URL_DU_REPO_GITHUB> /var/www/ctf
cd /var/www/ctf

# Créer le fichier .env
nano .env
```

Contenu du `.env` :

```env
VITE_SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...votre_anon_key...
VITE_SUPABASE_PROJECT_ID=votre_project_id
```

> Ces valeurs se trouvent dans votre projet Supabase → **Settings → API**

### 3. Builder et déployer

```bash
cd /var/www/ctf
npm install
npm run build
sudo cp -r dist/* /var/www/ctf-site/
```

### 4. Configurer Nginx

```bash
sudo nano /etc/nginx/sites-available/ctf
```

```nginx
server {
    listen 80;
    server_name votre-domaine.com;  # ou l'IP de la VM

    root /var/www/ctf-site;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ctf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Configuration Supabase

### Créer le projet

1. Aller sur [supabase.com](https://supabase.com) → **New Project**
2. Récupérer l'URL et la clé `anon` dans **Settings → API**

### Appliquer le schéma de base de données

Les fichiers SQL se trouvent dans `supabase/migrations/`. Les exécuter dans l'ordre chronologique via **Supabase → SQL Editor**.

### Déployer les Edge Functions

```bash
npm install -g supabase
supabase login
supabase link --project-ref VOTRE_PROJECT_ID
supabase functions deploy verify-flag
supabase functions deploy record-external-submission
```

### Configurer l'auth

Dans Supabase → **Authentication → Settings** :
- **Site URL** : `https://votre-domaine.com`
- **Redirect URLs** : `https://votre-domaine.com/**`

---

## Mettre à jour le site

Le code se synchronise automatiquement sur GitHub à chaque modification sur Lovable. Pour mettre à jour la VM :

```bash
cd /var/www/ctf
git pull origin main
npm run build
sudo cp -r dist/* /var/www/ctf-site/
```

C'est tout. Nginx sert les fichiers statiques, pas besoin de le redémarrer.

---

## Bot Discord

Optionnel. Permet aux joueurs de récupérer un flag via Discord.

### Installation

```bash
cd discord-bot
pip install -r requirements.txt
```

### Configuration

Éditer `discord-bot/bot.py` :

```python
TOKEN = "TON_TOKEN_DISCORD"
WELCOME_CHANNEL_ID = 123456789
ROLE_ID = 123456789
CTF_CHANNEL_ID = 123456789
```

Éditer `discord-bot/ui_components.py` :

```python
CHALLENGE_ID = "UUID_DU_CHALLENGE_DISCORD"  # Récupérer depuis le panel Admin
```

### Lancer le bot (service systemd)

```bash
sudo nano /etc/systemd/system/ctf-bot.service
```

```ini
[Unit]
Description=CTF Discord Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/ctf/discord-bot
ExecStart=/usr/bin/python3 bot.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ctf-bot
sudo systemctl start ctf-bot
```

---

## Challenges externes

Les challenges web (PHP) se lancent via Docker.

```bash
# Button Redirect
cd public/challenges/button-redirect
docker build -t ctf-button-redirect .
docker run -d -p 3378:3378 ctf-button-redirect

# Inspect ISEN
cd public/challenges/inspect-isen
docker build -t ctf-inspect-isen .
docker run -d -p 3379:3378 ctf-inspect-isen
```

### Lier un challenge externe à la plateforme

1. Créer le challenge dans le panel **Admin**
2. Copier son **UUID**
3. Dans le champ **URL externe**, mettre :
   ```
   http://IP_DE_LA_VM:3378/?challengeId=UUID_DU_CHALLENGE
   ```
4. Si la validation se fait entièrement dans le challenge externe, activer **"Masquer soumission de flag"** dans l'admin

---

## Gestion des admins

L'utilisateur doit d'abord créer un compte sur la plateforme, puis via **Supabase → SQL Editor** :

```sql
-- Trouver l'ID de l'utilisateur
SELECT id, email FROM auth.users WHERE email = 'admin@exemple.com';

-- Lui donner le rôle admin
UPDATE public.user_roles SET role = 'admin' WHERE user_id = 'UUID_ICI';
```

### Réinitialiser les scores entre deux sessions CTF

```sql
DELETE FROM public.submissions;
DELETE FROM public.players;
```

> ⚠️ Irréversible. Faire un export avant si besoin.

---

## Problèmes fréquents

| Problème | Solution |
|----------|----------|
| Page blanche après build | Vérifier que le `.env` est présent et correct |
| Challenges n'apparaissent pas | Relancer les migrations SQL |
| Flag non accepté | Redéployer `verify-flag` via Supabase CLI |
| 404 sur les routes | Vérifier `try_files $uri /index.html` dans Nginx |
| Erreur CORS | Vérifier `VITE_SUPABASE_URL` dans le `.env` |
