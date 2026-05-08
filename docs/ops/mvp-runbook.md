# MVP Runbook

## Prerequisites
- Node.js 20+
- npm workspaces available

## Install and Build
```bash
npm install
npm run build
```

## Start Infra (optional for current in-memory MVP)
```bash
docker compose -f infra/docker-compose.yml up -d
```

## Run Test Suite
```bash
npm test
```

## Run Smoke Validation
```bash
npm run e2e:smoke
```
Expected output includes `SMOKE_OK` with workflow, render job, and concat output path.

## Run 100-Concurrency Validation
```bash
npm run load:100
```
Expected output includes `LOAD_OK` with `total:100` and no errors.

## Operational Notes
- Current API uses in-memory store for auth/credits/workflow states.
- Concat uses manifest fallback when ffmpeg is unavailable (`NO_FFMPEG=1`).
- Media files are written under `MEDIA_ROOT` (default `./data`).

## Troubleshooting
- Build failures: run `npm run build` and inspect package-specific TypeScript errors.
- Test failures: run package tests directly, e.g. `npm --workspace=@app/api run test`.
- Missing concat output: ensure write permissions for `MEDIA_ROOT`.
