# Deployment Guide — Lil_Bin Company OS

## 1. Local Development (Mac mini)

**Prerequisites:** Node.js 20+, Docker (for PostgreSQL) or a local Postgres instance.

```bash
cp .env.example .env        # edit DATABASE_URL and INTERNAL_API_KEY
docker compose up -d         # starts PostgreSQL on port 5432
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev                  # http://localhost:3000
```

## 2. Mac mini Internal Server

Use this for a persistent internal deployment without Docker for the app itself.

```bash
# 1. Database (same as local dev)
docker compose up -d

# 2. Build & run
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run build
npm start                    # serves on port 3000

# 3. (Optional) Process management with pm2
npm install -g pm2
pm2 start npm --name lilbin -- start
pm2 save
pm2 startup                  # auto-restart on reboot
```

## 3. Docker Deployment

The project includes a multi-stage `Dockerfile` that produces a minimal standalone image.

```bash
# 1. Start the database
docker compose up -d

# 2. Build the app image
docker build -t lilbin-app .

# 3. Run the app
docker run -p 3000:3000 --env-file .env --network host lilbin-app
```

> **Note:** `--network host` lets the container reach the Postgres instance on the host.
> On macOS Docker Desktop, replace `localhost` in `DATABASE_URL` with `host.docker.internal`.

## 4. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://lilbin:lilbin_secret@localhost:5432/lilbin_db` |
| `INTERNAL_API_KEY` | Yes (prod) | API key for all Lil_Bin internal requests. **Must** be set when `NODE_ENV=production`. |
| `NODE_ENV` | No | `production` or `development`. Defaults to `development`. |

## 5. Database Management

| Task | Command |
|---|---|
| Generate Prisma client | `npm run db:generate` |
| Create a migration | `npm run db:migrate -- --name description` |
| Run seed data | `npm run db:seed` |
| Reset database (destructive) | `npm run db:reset` |
| Visual DB browser (port 5555) | `npm run db:studio` |
| API seed reset | `POST /api/v1/system/seed` with `{"confirm": true}` (requires API key) |

## 6. Health Check

**No auth required:**

```bash
curl -s http://localhost:3000/api/v1/system/health
```

Returns `status` and entity counts (workspaces, agents, tasks, etc.).

**Auth required:**

```bash
curl -s -H "x-api-key: $API_KEY" http://localhost:3000/api/v1/system/stats
```

Returns activity metrics and system statistics.
