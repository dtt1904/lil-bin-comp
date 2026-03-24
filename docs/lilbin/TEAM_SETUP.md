# Team Setup Guide (Live + Demo Safe Workflow)

This guide is for team members setting up the app without risking real data.

## 1) One-time prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL)
- Project cloned locally

## 2) Start PostgreSQL

```bash
docker compose up -d
```

## 3) Choose your profile

You must use one of these profiles:

- **Live profile**: real team data, no destructive ops
- **Demo profile**: sandbox/testing data, destructive ops allowed

### Live profile setup (recommended default)

```bash
cp .env.live.example .env
npm install
npm run db:generate
npm run db:migrate -- --name init_live
npm run dev
```

Important:
- `ALLOW_DESTRUCTIVE_DB_OPS=false`
- Do **not** run seed/reset on live profile

### Demo profile setup

```bash
cp .env.demo.example .env
npm install
npm run db:generate
npm run db:migrate -- --name init_demo
ALLOW_DESTRUCTIVE_DB_OPS=true npm run db:seed:unsafe
npm run dev
```

## 4) Safety rules (must follow)

1. Never run `db:reset` in live profile.
2. Never call `/api/v1/system/seed` in live profile.
3. Keep `ALLOW_DESTRUCTIVE_DB_OPS=false` for live.
4. Only enable destructive flag in demo profile.
5. Before destructive actions, verify current DB:

```bash
echo "$DATABASE_URL"
```

## 5) What commands are safe vs destructive

### Safe in live

```bash
npm run db:generate
npm run db:migrate -- --name <change_name>
npm run dev
npm run build
```

### Destructive (demo only)

```bash
ALLOW_DESTRUCTIVE_DB_OPS=true npm run db:seed
ALLOW_DESTRUCTIVE_DB_OPS=true npm run db:seed:unsafe
ALLOW_DESTRUCTIVE_DB_OPS=true npm run db:reset
ALLOW_DESTRUCTIVE_DB_OPS=true npm run db:reset:unsafe
```

API destructive reset requires:
- `ALLOW_DESTRUCTIVE_DB_OPS=true`
- body: `{"confirm": true}`
- header: `x-confirm-destructive: RESET_DB`

## 6) Quick backup for live data

Before migrations:

```bash
pg_dump "$DATABASE_URL" > backup_$(date +%F_%H%M).sql
```

Restore:

```bash
psql "$DATABASE_URL" < backup_YYYY-MM-DD_HHMM.sql
```

## 7) Daily workflow for team

1. Pull latest code.
2. Verify `.env` is live profile.
3. Run migration if needed.
4. Start app + runner.
5. Never run seed/reset unless you intentionally switched to demo profile.
