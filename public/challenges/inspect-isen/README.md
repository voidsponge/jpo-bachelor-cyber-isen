# Challenge CTF - Inspect ISEN

Challenge d'inspection de code source. Le flag est caché dans un commentaire HTML.

## Construction du conteneur

```bash
docker build -t ctf-inspect-isen .
```

## Lancer le conteneur

```bash
docker run --rm -p 3378:3378 ctf-inspect-isen:latest
```

## Configuration dans le CTF

1. Créer un challenge dans le panel Admin
2. Mettre l'URL externe : `http://VOTRE_IP:3378/?challengeId=UUID_DU_CHALLENGE`
3. Le système transmettra automatiquement `sessionId` et `pseudo` au joueur

## Fichiers

- `index.php` - Page principale ISEN avec le flag caché en commentaire HTML
- `submit.php` - Page de soumission du flag connectée au backend CTF
- `flag-gen.py` - Générateur de flag dynamique
- `FG_ADJ` / `FG_NAME` - Listes de mots pour la génération
- `setup.sh` - Script de démarrage
