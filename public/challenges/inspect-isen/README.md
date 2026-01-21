# Challenge: Inspect ISEN

Challenge Web basique où le flag est caché dans un commentaire HTML.

## Build & Run

### Mode production (rebuild à chaque changement)
```bash
docker build -t ctf-inspect-isen .
docker run --rm -p 3378:3378 ctf-inspect-isen
```

### Mode développement (hot-reload des fichiers PHP)
```bash
# Build une fois
docker build -t ctf-inspect-isen .

# Run avec volume mount (depuis le dossier du challenge)
docker run --rm -p 3378:3378 \
  -v "$(pwd)/index.php:/var/www/html/index.php" \
  -v "$(pwd)/submit.php:/var/www/html/submit.php" \
  ctf-inspect-isen
```

Les modifications sur `index.php` et `submit.php` sont visibles immédiatement sans rebuild.

## Configuration dans le CTF

1. Créer un challenge dans le panel Admin
2. Mettre l'URL externe : `http://VOTRE_IP:3378/?challengeId=UUID_DU_CHALLENGE`
3. Le système transmettra automatiquement `sessionId` et `pseudo` au joueur

## Fichiers

- `index.php` - Page principale ISEN avec le flag caché en commentaire HTML
- `submit.php` - Page de soumission du flag (même style que button-redirect)
- `flag-gen.py` - Génère un flag dynamique au démarrage
- `setup.sh` - Script de démarrage (génère le flag + lance PHP)

## Test local

```bash
# Accès direct (sans CTF)
http://localhost:3378/

# Avec paramètres CTF simulés
http://localhost:3378/submit.php?challengeId=test-123&sessionId=sess-456&pseudo=TestPlayer
```
