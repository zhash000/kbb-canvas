# multimodal-video-platform (monorepo)

This repository bootstrap uses **npm workspaces** (Node 20+).

Common commands:

```bash
npm install
npm run build
npm test
```

Smoke and load checks:

```bash
npm run e2e:smoke
npm run load:100
```

Local infrastructure (Postgres + Redis) for later tasks:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Operational details: see `docs/ops/mvp-runbook.md`.
