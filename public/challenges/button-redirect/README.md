# Challenge Button Redirect - CTF ISEN

## Description
Challenge Web où le joueur doit trouver comment activer un bouton désactivé pour accéder au flag.

## Build & Run

```bash
# Build the container
docker build -t ctf-button-redirect .

# Run the container
docker run --rm -p 3378:3378 ctf-button-redirect:latest
```

## Intégration CTF

Ce challenge est intégré avec la plateforme CTF ISEN. Pour que les points soient comptabilisés:

### 1. Créer le challenge dans l'admin CTF
- Catégorie: Web
- Points: selon difficulté
- **Important**: Récupérer l'ID UUID du challenge créé

### 2. Configurer l'URL externe
Dans l'admin, mettre l'URL externe avec les paramètres de session:
```
http://192.168.240.201:3378/?challengeId=UUID_DU_CHALLENGE
```

Le système passera automatiquement `sessionId` et `pseudo` en paramètres.

### 3. Configurer le flag dans Supabase
Le flag généré dynamiquement suit le format: `FLAG_ISEN{Animal_Adjectif}`

**Option A** - Flag statique dans la DB:
Définir un flag fixe dans le champ `flag` du challenge dans Supabase.

**Option B** - Validation externe:
Laisser le champ `flag` vide et modifier `record-external-submission` pour accepter le pattern `FLAG_ISEN{*}`.

## Flux utilisateur
1. Joueur accède au challenge depuis l'Arena CTF
2. Le modal s'ouvre avec le lien vers le challenge externe
3. Joueur clique → nouvelle fenêtre s'ouvre avec `sessionId`, `pseudo`, et `challengeId`
4. Joueur résout le challenge (active le bouton disabled)
5. Joueur trouve le flag sur la page cachée
6. Joueur soumet le flag via le formulaire intégré
7. Points crédités automatiquement sur le leaderboard CTF

## Solution
Le bouton a l'attribut `disabled="true"`. Le joueur doit:
1. Inspecter l'élément (F12)
2. Supprimer l'attribut `disabled`
3. Cliquer sur le bouton
4. Copier le flag affiché et le soumettre
