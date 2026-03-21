# Bản đồ mã nguồn

## Tài liệu Lil_Bin

```
docs/lilbin/
  README.md      ← Mục lục & thứ tự đọc
  OVERVIEW.md
  RUNBOOK.md
  API.md
  DATA_MODEL.md
  CODE_MAP.md    ← file này
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

Mỗi thư mục con có `route.ts`; dynamic segment `[id]`, v.v.

## Core libraries

| File | Vai trò |
|------|---------|
| `src/lib/api-auth.ts` | `authenticateRequest`, JSON helpers |
| `src/lib/store.ts` | Singleton `store`, `generateId`, CRUD helpers |
| `src/lib/types.ts` | Types & enums |
| `src/lib/mock-data.ts` | Seed |
| `src/lib/helpers.ts` | formatRelativeTime, formatCurrency, badge colors |

## UI Dashboard

```
src/app/(dashboard)/
  layout.tsx           Sidebar + Topbar + CommandPalette
  page.tsx             Command Center
  workspaces/          agents/              tasks/
  departments/         projects/            approvals/
  logs/                knowledge/           analytics/
  settings/            modules/listings|content|invoices/
```

```
src/components/
  layout/              dashboard/           agents/
  tasks/               workspaces/
src/components/ui/     shadcn components
```

## Cấu hình

- `package.json` — scripts: `dev`, `build`, `start`, `lint`
- `.env` — `INTERNAL_API_KEY`, `DATABASE_URL`
- `prisma/schema.prisma` — DB tương lai
- `next.config.ts`, `tsconfig.json`, `components.json`

## Gợi ý cho agent đọc code

1. Đọc `docs/lilbin/API.md` trước khi gọi endpoint.
2. Khi debug hành vi ghi: mở đúng `src/app/api/v1/.../route.ts`.
3. Khi đồng bộ UI với API: thay import `mock-data` bằng fetch tới `/api/v1` hoặc server actions gọi store/DB.
