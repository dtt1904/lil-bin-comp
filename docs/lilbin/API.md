# Internal API — `/api/v1`

## Base URL

- Local: `http://localhost:3000/api/v1`
- Production: `https://<host>/api/v1`

## Xác thực

| Header | Bắt buộc | Mô tả |
|--------|----------|--------|
| `x-api-key` | Có (trừ health) | Phải khớp `INTERNAL_API_KEY` |
| `Authorization: Bearer <key>` | Thay thế | Tương đương `x-api-key` |
| `x-organization-id` | Không | Mặc định `org-1` |

**401** nếu thiếu/sai key.

## Định dạng response

- Thành công danh sách: `{ "data": [...], "meta": { "total", "limit", "offset" } }`
- Thành công một bản ghi: `{ "data": { ... } }`
- Tạo mới: thường **201**
- Xóa: `{ "success": true }`
- Lỗi: `{ "error": "...", "details"?: ... }`

---

## Bảng endpoint

### Organization & cấu trúc

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/workspaces` | Danh sách. Query: `type` (HQ\|CLIENT\|INTERNAL) |
| POST | `/workspaces` | Tạo: `name`, `slug`, `type`, `description?`, `iconUrl?` |
| GET | `/workspaces/:id` | Chi tiết + thống kê |
| PATCH | `/workspaces/:id` | Cập nhật |
| DELETE | `/workspaces/:id` | Xóa (cascade phụ thuộc route) |
| GET | `/departments` | Query: `workspaceId` |
| POST | `/departments` | `workspaceId`, `name`, `description?` |
| GET/PATCH/DELETE | `/departments/:id` | CRUD |

### Agents & projects

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/agents` | Query: `workspaceId`, `departmentId`, `status` |
| POST | `/agents` | Tạo agent (model, provider, systemPrompt, …) |
| GET/PATCH/DELETE | `/agents/:id` | CRUD |
| PATCH | `/agents/:id/status` | Đổi status + heartbeat + log |
| GET | `/projects` | Query: `workspaceId`, `status` |
| POST | `/projects` | Tạo project |
| GET/PATCH/DELETE | `/projects/:id` | CRUD |

### Tasks & execution

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/tasks` | Query: `workspaceId`, `projectId`, `agentId`, `status`, `priority`, `limit`, `offset` |
| POST | `/tasks` | Tạo task |
| GET/PATCH/DELETE | `/tasks/:id` | Chi tiết / cập nhật / xóa |
| GET/POST | `/tasks/:id/runs` | Danh sách run / tạo run |
| PATCH | `/tasks/:id/runs/:runId` | Cập nhật run (hoàn thành/thất bại → đồng bộ task, cost) |
| GET/POST | `/tasks/:id/comments` | Comment |

### Approvals & notifications

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/approvals` | Query: `status`, `taskId`, `workspaceId`, … |
| POST | `/approvals` | Tạo yêu cầu duyệt |
| GET/PATCH | `/approvals/:id` | Xem / sửa |
| POST | `/approvals/:id/review` | Body: `action`: `approve` \| `deny`, `reviewerId`, `reviewNote?` |
| GET/POST | `/notifications` | Query: `userId`, `isRead`, `severity` |
| PATCH/DELETE | `/notifications/:id` | Đánh dấu đọc / xóa |
| POST | `/notifications/mark-all-read` | Body: `userId` |

### Knowledge

| Method | Path | Mô tả |
|--------|------|--------|
| GET/POST | `/knowledge/memory` | Query filter: `workspaceId`, `type`, `visibility`, `search`, `tags` |
| GET/PATCH/DELETE | `/knowledge/memory/:id` | CRUD |
| GET/POST | `/knowledge/sops` | SOP documents |
| GET/PATCH/DELETE | `/knowledge/sops/:id` | CRUD |
| GET/POST | `/knowledge/prompts` | Prompt templates |
| GET/PATCH/DELETE | `/knowledge/prompts/:id` | CRUD |

### Observability & cost

| Method | Path | Mô tả |
|--------|------|--------|
| GET/POST | `/logs` | Query: `workspaceId`, `agentId`, `taskId`, `level`, `search`, `limit`, `offset` |
| GET/POST | `/costs` | Query filter; `aggregate=agent\|workspace\|model\|daily` |
| GET | `/costs/summary` | Tổng hợp chi phí theo thời gian / agent / workspace |

### Modules (cài trên workspace)

| Method | Path | Mô tả |
|--------|------|--------|
| GET/POST | `/modules` | Cài module: `workspaceId`, `moduleSlug`, `moduleName`, `version?`, `config?` |
| GET/PATCH/DELETE | `/modules/:id` | CRUD installation |

### Real estate / content pipeline

| Method | Path | Mô tả |
|--------|------|--------|
| GET/POST | `/listings` | Listing queue |
| GET/PATCH/DELETE | `/listings/:id` | CRUD + cascade media/drafts khi xóa |
| POST | `/listings/:id/transition` | Body: `status` — chuyển trạng thái pipeline |
| GET/POST | `/media` | Media theo listing |
| GET/PATCH/DELETE | `/media/:id` | CRUD |
| GET/POST | `/drafts` | Post drafts |
| GET/PATCH/DELETE | `/drafts/:id` | CRUD (một số chuyển status tự tạo published post) |
| GET/POST | `/posts` | Published posts |
| GET/POST | `/shares` | Share tasks |
| PATCH | `/shares/:id` | Cập nhật share |
| GET/POST | `/invoices` | Invoice snapshots; query `overdue` |
| GET/PATCH/DELETE | `/invoices/:id` | CRUD |

### System

| Method | Path | Auth |
|--------|------|------|
| GET | `/system/health` | **Không** |
| GET | `/system/stats` | Có |
| POST | `/system/seed` | Có; body `{ "confirm": true }`, header `x-confirm-destructive: RESET_DB`, và chỉ chạy khi `ALLOW_DESTRUCTIVE_DB_OPS=true` |

---

## Ví dụ nhanh

```bash
# Tạo workspace
curl -X POST -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Client Alpha","slug":"client-alpha","type":"CLIENT"}' \
  "$BASE/api/v1/workspaces"

# Tạo task
curl -X POST -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"workspaceId":"ws-hq","title":"Review Q1 pipeline","priority":"HIGH"}' \
  "$BASE/api/v1/tasks"

# Ghi log vận hành
curl -X POST -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"level":"INFO","message":"lil_Bin: nightly sync completed","workspaceId":"ws-hq"}' \
  "$BASE/api/v1/logs"
```

Chi tiết validation từng route: đọc file tương ứng trong `src/app/api/v1/`.
