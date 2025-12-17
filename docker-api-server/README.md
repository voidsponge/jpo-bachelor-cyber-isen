# Docker API Server pour CTF

Ce serveur doit être déployé sur ta VM Docker dédiée.

## Installation

```bash
cd docker-api-server
npm install
```

## Configuration

Créer un fichier `.env` :

```env
PORT=3001
API_SECRET=ton_secret_pour_securiser_api
CORS_ORIGIN=https://ton-site-ctf.lovable.app
```

## Lancement

```bash
npm start
```

## Endpoints

### POST /api/container/start
Démarre un nouveau container pour une session.

```json
{
  "image": "ctf/linux-basics:latest",
  "sessionId": "abc123",
  "ports": "80:8080"
}
```

### POST /api/container/stop
Arrête et supprime un container.

```json
{
  "containerId": "container_id_here"
}
```

### WebSocket /api/terminal/:containerId
Connection WebSocket pour terminal interactif.

## Sécurité

- L'API vérifie un header `X-API-Secret` sur chaque requête
- Les containers sont isolés par session
- Timeout automatique après 30 minutes d'inactivité
