# Runbook — Vận hành & môi trường

## Yêu cầu

- Node.js 20+ (khuyến nghị LTS)
- Docker (cho PostgreSQL) hoặc Postgres cài sẵn
- `npm install` tại root repo

## Khởi tạo nhanh

```bash
npm run setup          # install + generate + migrate (safe, không seed)
```

Hoặc từng bước:

```bash
docker compose up -d   # khởi động PostgreSQL
npm install
npm run db:generate
npm run db:migrate -- --name init
# Chỉ seed demo khi thực sự cần (destructive):
ALLOW_DESTRUCTIVE_DB_OPS=true npm run db:seed:unsafe
```

## Chạy dev

```bash
npm run dev
```

Mặc định: **http://localhost:3000**

## Biến môi trường

File `.env` (không commit secret production):

| Biến | Mô tả |
|------|--------|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL, vd: `postgresql://lilbin:lilbin_secret@localhost:5432/lilbin_db` |
| `INTERNAL_API_KEY` | Khóa cho mọi request API nội bộ (header `x-api-key`). **Bắt buộc** ở production. Dev fallback: `lilbin-dev-key-2024`. |
| `NODE_ENV` | `production` hoặc `development`. |
| `ALLOW_DESTRUCTIVE_DB_OPS` | Mặc định `false`. Đặt `true` chỉ khi cần thao tác phá dữ liệu (seed/reset). |
| `x-organization-id` (header) | Tùy chọn; mặc định logic dùng `org-1`. |

## Gọi API từ Lil_Bin

```bash
export BASE_URL="http://localhost:3000"
export API_KEY="<giá trị INTERNAL_API_KEY trong .env>"

curl -s -H "x-api-key: $API_KEY" "$BASE_URL/api/v1/workspaces"
```

Hoặc Bearer:

```bash
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/api/v1/system/stats"
```

## Health (không cần API key)

```bash
curl -s http://localhost:3000/api/v1/system/health
```

Trả về `status`, `counts` (workspaces, agents, tasks, …).

## Database

### Migrations

```bash
npm run db:migrate -- --name mo_ta_migration
```

### Seed dữ liệu mẫu

```bash
ALLOW_DESTRUCTIVE_DB_OPS=true npm run db:seed
```

### Reset database (xóa toàn bộ, tạo lại)

```bash
ALLOW_DESTRUCTIVE_DB_OPS=true npm run db:reset
```

> **Cảnh báo:** Lệnh này xóa toàn bộ dữ liệu.

### Xem database trực quan

```bash
npm run db:studio    # mở Prisma Studio tại port 5555
```

### Reset dữ liệu qua API

**Cần API key.** Xóa toàn bộ và nạp lại seed data.

```bash
curl -s -X POST -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -H "x-confirm-destructive: RESET_DB" \
  -d '{"confirm":true}' \
  "$BASE_URL/api/v1/system/seed"
```

Endpoint trên chỉ hoạt động khi `ALLOW_DESTRUCTIVE_DB_OPS=true`.

## Build production

```bash
npm run build
npm start
```

Hoặc dùng Docker:

```bash
docker build -t lilbin-app .
docker run -p 3000:3000 --env-file .env --network host lilbin-app
```

## Lưu ý vận hành

- Database là **PostgreSQL** — dữ liệu persist qua Docker volume `pgdata`.
- Dữ liệu **không mất** khi restart server (khác với in-memory store cũ).
- `docker compose up -d` để khởi động/khôi phục Postgres.
- Bảo vệ `INTERNAL_API_KEY` ở production (secret manager, không log).
- Ở production, `INTERNAL_API_KEY` **bắt buộc** phải set — không có fallback.
