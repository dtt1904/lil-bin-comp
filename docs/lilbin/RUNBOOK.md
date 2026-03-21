# Runbook — Vận hành & môi trường

## Yêu cầu

- Node.js (khuyến nghị LTS)
- `npm install` tại root repo

## Chạy dev

```bash
npm run dev
```

Mặc định: **http://localhost:3000**

## Biến môi trường

File `.env` (không commit secret production):

| Biến | Mô tả |
|------|--------|
| `INTERNAL_API_KEY` | Khóa cho mọi request API nội bộ (header `x-api-key`). Fallback dev: `lilbin-dev-key-2024` nếu không set. |
| `DATABASE_URL` | Chuỗi Prisma/Postgres (khi migrate sang DB thật). |
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

## Reset dữ liệu về seed ban đầu

**Cần API key.** Xóa toàn bộ thay đổi trong RAM store và nạp lại từ `mock-data`.

```bash
curl -s -X POST -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"confirm":true}' \
  "$BASE_URL/api/v1/system/seed"
```

## Build production

```bash
npm run build
npm start
```

## Lưu ý vận hành

- Store hiện tại là **in-memory**: restart server = mất thay đổi (trừ khi đã persist DB).
- Bảo vệ `INTERNAL_API_KEY` ở production (secret manager, không log).
