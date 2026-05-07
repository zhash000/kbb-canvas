# multimodal-video-platform (monorepo)

This repository bootstrap uses **npm workspaces** (Node 20+).

Common commands:

```bash
npm install
npm run build
```

Local infrastructure (Postgres + Redis) for later tasks:

```bash
docker compose -f infra/docker-compose.yml up -d
```
