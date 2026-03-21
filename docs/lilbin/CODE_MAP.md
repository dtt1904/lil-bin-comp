# Code Map

## Documentation

```
docs/lilbin/
  README.md      ← Index & reading order
  OVERVIEW.md    ← System vision & architecture
  RUNBOOK.md     ← Operations guide
  API.md         ← Full API reference
  DATA_MODEL.md  ← Schema & entities
  CODE_MAP.md    ← This file
  DEPLOY.md      ← Deployment guide
```

## API (Next.js App Router)

```
src/app/api/v1/
  workspaces/          departments/         agents/
  projects/            tasks/               approvals/
  notifications/       knowledge/           logs/
  costs/               modules/             listings/
  media/               drafts/              posts/
  shares/              invoices/            system/
```

Each subfolder has `route.ts`; dynamic segments via `[id]`, etc.
All routes use Prisma for persistence — no in-memory store.

## Core Libraries

| File | Role |
|------|------|
| `src/lib/db.ts` | Prisma client singleton (PrismaPg adapter) |
| `src/lib/api-auth.ts` | `authenticateRequest`, JSON helpers, production key enforcement |
| `src/lib/helpers.ts` | formatRelativeTime, formatCurrency, badge colors |

### Legacy (kept for reference, not used at runtime)

| File | Role |
|------|------|
| `src/lib/store.ts` | Former in-memory store — replaced by Prisma |
| `src/lib/types.ts` | TypeScript types (UI may still reference for interfaces) |
| `src/lib/mock-data.ts` | Original seed data — now lives in `prisma/seed.ts` |

## Database

| File | Role |
|------|------|
| `prisma/schema.prisma` | 29 models, 24 enums, full relations & indexes |
| `prisma.config.ts` | Prisma config with env-based DATABASE_URL |
| `prisma/seed.ts` | Comprehensive seed script (run via `npm run db:seed`) |
| `docker-compose.yml` | PostgreSQL 16 via Docker |

## UI Dashboard

```
src/app/(dashboard)/
  layout.tsx           Sidebar + Topbar + CommandPalette
  page.tsx             Command Center (server component → Prisma)
  workspaces/          agents/              tasks/
  departments/         projects/            approvals/
  logs/                knowledge/           analytics/
  settings/            modules/listings|content|invoices/
```

All page components are async server components that query Prisma directly.
Client-side interactive components receive serialized data as props.

```
src/components/
  layout/              dashboard/           agents/
  tasks/               workspaces/
src/components/ui/     shadcn components
```

## Configuration

- `package.json` — scripts: `dev`, `build`, `start`, `db:*`, `setup`
- `.env` / `.env.example` — `INTERNAL_API_KEY`, `DATABASE_URL`
- `next.config.ts` — `output: "standalone"` for Docker builds
- `tsconfig.json`, `components.json`
- `Dockerfile` — Multi-stage Node.js 20 Alpine build

## Architecture Flow

```
lil_Bin (AI agent)
    │
    ├── POST /api/v1/tasks        ──→ route.ts ──→ prisma.task.create()
    ├── GET  /api/v1/agents       ──→ route.ts ──→ prisma.agent.findMany()
    └── POST /api/v1/system/seed  ──→ route.ts ──→ prisma.$transaction()

Browser (dashboard)
    │
    └── GET /workspaces           ──→ page.tsx (server) ──→ prisma.workspace.findMany()
                                       └── <WorkspaceCard data={...} />  (client)
```

## Agent Tips

1. Read `docs/lilbin/API.md` before calling any endpoint.
2. When debugging writes: open the matching `src/app/api/v1/.../route.ts`.
3. All data flows through PostgreSQL — no in-memory state.
4. To reset data: `POST /api/v1/system/seed` then `npm run db:seed`.
