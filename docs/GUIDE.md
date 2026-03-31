# lil_Bin Company OS — Hướng dẫn sử dụng đầy đủ

> Tài liệu này hướng dẫn từ cài đặt, cấu hình, vận hành, đến mô hình tự động hoá đa ngành.

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Yêu cầu phần cứng & phần mềm](#2-yêu-cầu-phần-cứng--phần-mềm)
3. [Cài đặt từ đầu](#3-cài-đặt-từ-đầu)
4. [Biến môi trường](#4-biến-môi-trường)
5. [Kiến trúc hệ thống](#5-kiến-trúc-hệ-thống)
6. [Workspace & Template](#6-workspace--template)
7. [Runner (Mac mini 24/7)](#7-runner-mac-mini-247)
8. [Fanpage Automation Pipeline](#8-fanpage-automation-pipeline)
9. [LangGraph Supervisor (AI Brain)](#9-langgraph-supervisor-ai-brain)
10. [API Reference tóm tắt](#10-api-reference-tóm-tắt)
11. [Dashboard UI](#11-dashboard-ui)
12. [Deploy lên Production (Vercel)](#12-deploy-lên-production-vercel)
13. [Mở rộng đa ngành](#13-mở-rộng-đa-ngành)
14. [Xử lý sự cố](#14-xử-lý-sự-cố)
15. [Câu hỏi thường gặp](#15-câu-hỏi-thường-gặp)

---

## 1. Tổng quan hệ thống

**lil_Bin Company OS** là nền tảng vận hành AI đa workspace, cho phép quản lý nhiều doanh nghiệp/client từ một hệ thống duy nhất.

```
Organization (org-1)
  ├── Bros-photo Fanpage       (workspace)
  ├── Tai Dinh Fanpage         (workspace)
  ├── Trucking Company ABC     (workspace)
  ├── Roofing Pro LLC          (workspace)
  └── Real Estate Agent X      (workspace)
```

Mỗi workspace là một đơn vị cách ly hoàn toàn — data, task, agent, module, log riêng biệt.

**Thành phần chính:**

| Thành phần | Vai trò | Chạy ở đâu |
|---|---|---|
| Dashboard UI | Bảng điều khiển trực quan | Vercel |
| API Layer | REST API cho mọi thao tác | Vercel |
| Runner | Xử lý task 24/7 | Mac mini |
| Fanpage Pipeline | Tự động nội dung Facebook | Mac mini |
| LangGraph Supervisor | AI brain — tự phân task, giám sát, báo cáo | Mac mini |
| PostgreSQL | Database | Docker / Supabase / Neon |

---

## 2. Yêu cầu phần cứng & phần mềm

### Mac mini (runner)
- macOS 13+
- Node.js 20+
- Docker Desktop (cho PostgreSQL local)
- Git

### Development machine
- Node.js 20+
- npm 9+
- Docker Desktop
- Code editor (Cursor / VS Code)

---

## 3. Cài đặt từ đầu

### Bước 1: Clone repo

```bash
git clone https://github.com/dtt1904/lil-bin-comp.git
cd lil-bin-comp
```

### Bước 2: Cài dependencies

```bash
npm install
```

### Bước 3: Khởi động PostgreSQL

```bash
docker compose up -d
```

Lệnh này khởi động PostgreSQL 16 trên port 5432, user `lilbin`, password `lilbin_secret`.

### Bước 4: Tạo file `.env`

```bash
cp .env.demo.example .env
```

Chỉnh sửa `.env`:

```env
DATABASE_URL="postgresql://lilbin:lilbin_secret@localhost:5432/lilbin_db?schema=public"
INTERNAL_API_KEY="your-secret-api-key"
ALLOW_DESTRUCTIVE_DB_OPS="false"

# (Tùy chọn) Bật AI supervisor thông minh
OPENAI_API_KEY="sk-..."

# (Tùy chọn) Facebook integration
FB_PAGE_ID="your-page-id"
FB_PAGE_ACCESS_TOKEN="your-page-token"
```

### Bước 5: Setup database

```bash
npm run db:generate         # Generate Prisma client
npm run db:migrate -- --name init   # Chạy migration
```

### Bước 6: (Tùy chọn) Seed data demo

```bash
ALLOW_DESTRUCTIVE_DB_OPS=true npm run db:seed:unsafe
```

### Bước 7: Chạy development server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

### Setup nhanh (một lệnh)

```bash
npm run setup        # docker + generate + migrate
# Hoặc với demo data:
npm run setup:demo   # docker + generate + migrate + seed
```

---

## 4. Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `DATABASE_URL` | Có | PostgreSQL connection string |
| `INTERNAL_API_KEY` | Có (prod) | API key cho tất cả request nội bộ |
| `OPENAI_API_KEY` | Không | Bật AI planning/reporting cho supervisor. Nếu không có → dùng rule-based |
| `FB_PAGE_ID` | Không | Facebook Page ID cho fanpage automation |
| `FB_PAGE_ACCESS_TOKEN` | Không | Facebook Page Access Token |
| `ALLOW_DESTRUCTIVE_DB_OPS` | Không | `true` để cho phép seed/reset DB. Mặc định `false` |
| `NODE_ENV` | Không | `production` hoặc `development` |
| `ALLOW_PRODUCTION_SEED` | Không | `true` để cho phép seed trong production |
| `ALLOW_PRODUCTION_RESET` | Không | `true` để cho phép reset trong production |

---

## 5. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                    Bạn (CEO / Admin)                        │
│              Discord (OpenClaw) / Dashboard                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼───────┐             ┌─────────▼─────────┐
│  Dashboard UI │             │   API Layer       │
│  (Vercel)     │             │   /api/v1/*       │
│  Next.js SSR  │             │   (Vercel)        │
└───────┬───────┘             └─────────┬─────────┘
        │                               │
        └───────────────┬───────────────┘
                        │
              ┌─────────▼─────────┐
              │   PostgreSQL      │
              │   (Prisma ORM)    │
              └─────────┬─────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼───────┐             ┌─────────▼─────────┐
│  Runner       │             │  LangGraph        │
│  (Mac mini)   │             │  Supervisor       │
│  24/7 worker  │             │  (AI Brain)       │
└───────┬───────┘             └─────────┬─────────┘
        │                               │
        └───────────────┬───────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼────┐   ┌─────▼────┐  ┌─────▼────┐
    │ Fanpage │   │ Health   │  │ Custom   │
    │ Pipeline│   │ Check    │  │ Executor │
    └─────────┘   └──────────┘  └──────────┘
```

---

## 6. Workspace & Template

### Tạo workspace mới

```bash
# Qua API
curl -X POST http://localhost:3000/api/v1/workspaces \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Roofing Pro LLC",
    "slug": "roofing-pro",
    "type": "CLIENT",
    "description": "Roofing company operations",
    "templateId": "client_core"
  }'
```

### Template có sẵn

| Template | Dùng cho | Departments tự động |
|----------|----------|---------------------|
| `client_core` | Doanh nghiệp chung | Operations, Finance, Marketing, Content, Automation Ops |
| `fanpage_growth` | Fanpage / social media | Posting, Inbox & Community, Analytics, Content, Growth / Paid |

Template tự động tạo: departments, modules, agents, starter project, starter tasks.

### Bật/tắt LangGraph supervisor cho workspace

Supervisor mặc định bật cho tất cả workspace. Tắt cho workspace cụ thể:

```bash
curl -X PATCH http://localhost:3000/api/v1/workspaces/<id> \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"metadata": {"useLangGraph": false}}'
```

---

## 7. Runner (Mac mini 24/7)

Runner là worker chạy liên tục trên Mac mini, xử lý mọi task trong hệ thống.

### Khởi động runner

```bash
# Chạy mặc định
npm run runner

# Chạy chỉ cho Mac mini tasks
npm run runner:mac

# Chạy với tuỳ chọn
npx tsx scripts/run-worker.ts \
  --target MAC_MINI \
  --poll 5000 \
  --fanpage-interval 300000 \
  --supervisor-interval 600000
```

### Các flag

| Flag | Mô tả | Mặc định |
|------|--------|----------|
| `--target MAC_MINI` | Chỉ xử lý task cho Mac mini | `ANY` |
| `--poll 5000` | Polling interval (ms) | `5000` |
| `--no-fanpage` | Tắt fanpage scheduler | bật |
| `--fanpage-interval 300000` | Fanpage scheduler interval (ms) | `300000` (5 phút) |
| `--no-supervisor` | Tắt supervisor scheduler | bật |
| `--supervisor-interval 600000` | Supervisor scheduler interval (ms) | `600000` (10 phút) |

### Executor đã đăng ký

| Label | Chức năng |
|-------|----------|
| `health-check` | Kiểm tra health toàn hệ thống |
| `fanpage:discover` | Quét thư mục tìm content mới |
| `fanpage:draft` | Tạo caption/CTA cho content |
| `fanpage:post` | Đăng bài lên Facebook |
| `fanpage:engage` | Theo dõi engagement, tạo lead tasks |
| `supervisor:plan` | AI phân tách objective thành subtasks |
| `supervisor:monitor` | Kiểm tra health workspace, phân loại lỗi |
| `supervisor:report` | Tạo báo cáo tổng hợp |
| `default` | Fallback — xử lý task không có executor riêng |

### Chạy runner 24/7 với pm2

```bash
npm install -g pm2

# Khởi động runner
pm2 start npx --name lilbin-runner -- tsx scripts/run-worker.ts --target MAC_MINI

# Auto-restart khi reboot
pm2 save
pm2 startup

# Xem log
pm2 logs lilbin-runner

# Restart
pm2 restart lilbin-runner
```

---

## 8. Fanpage Automation Pipeline

### Pipeline stages

```
DISCOVERED → DRAFT → REVIEW → APPROVED → SCHEDULED → PUBLISHED
                                                    ↘ FAILED
```

### Modes

| Mode | Hành vi |
|------|---------|
| `dry_run` | Giả lập posting, không gọi Facebook API |
| `review` | Tạo draft nhưng không post — chờ duyệt (mặc định) |
| `live` | Post thật lên Facebook |

### Cấu hình fanpage cho workspace

```bash
# Xem config hiện tại
curl http://localhost:3000/api/v1/fanpage/config \
  -H "x-api-key: $API_KEY" \
  -H "x-workspace-id: <workspace-id>"

# Đổi mode
curl -X PATCH http://localhost:3000/api/v1/fanpage/config \
  -H "x-api-key: $API_KEY" \
  -H "x-workspace-id: <workspace-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "review",
    "autoDiscover": true,
    "autoDraft": true,
    "autoPost": false,
    "autoEngage": true,
    "contentSourcePath": "/path/to/content/folder"
  }'
```

### Xem trạng thái pipeline

```bash
curl http://localhost:3000/api/v1/fanpage/status \
  -H "x-api-key: $API_KEY" \
  -H "x-workspace-id: <workspace-id>"
```

### Setup Facebook token

1. Vào [Facebook Developer Portal](https://developers.facebook.com)
2. Tạo App → thêm quyền `pages_manage_posts`, `pages_read_engagement`
3. Lấy Page Access Token (long-lived)
4. Trong DB, tạo `IntegrationAccount`:
   - `platform`: `"facebook"`
   - `accountId`: Page ID
   - `accessToken`: Page Access Token
   - `workspaceId`: workspace tương ứng

---

## 9. LangGraph Supervisor (AI Brain)

Supervisor là "bộ não" của lil_Bin — tự phân task, giám sát, xử lý lỗi, và báo cáo.

### Ba chế độ hoạt động

| Mode | Khi nào chạy | Làm gì |
|------|--------------|--------|
| `plan` | Khi nhận objective mới | Phân tách objective → subtasks → tạo trong DB |
| `monitor` | Tự động mỗi 10 phút | Kiểm tra health, phân loại lỗi, tạo remediation |
| `report` | Tự động mỗi giờ | Tổng hợp kết quả, tạo executive summary |

### Gửi objective cho supervisor

```bash
# Yêu cầu supervisor lập kế hoạch
curl -X POST http://localhost:3000/api/v1/supervisor/plan \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "ws-bros-photo",
    "objective": "Đẩy 10 bài content fanpage tuần này và theo dõi lead"
  }'
```

Supervisor sẽ:
1. Nhận objective
2. Dùng LLM (nếu có `OPENAI_API_KEY`) hoặc rule-based logic để phân tách
3. Tạo subtasks: discover → draft → post → engage
4. Mỗi subtask tự động vào queue → runner xử lý

### Xem trạng thái supervisor

```bash
curl http://localhost:3000/api/v1/supervisor/status \
  -H "x-api-key: $API_KEY"

# Lọc theo workspace
curl http://localhost:3000/api/v1/supervisor/status \
  -H "x-api-key: $API_KEY" \
  -H "x-workspace-id: ws-bros-photo"
```

Response bao gồm:
- `health`: queued/running/completed/failed counts
- `recentSupervisorTasks`: 10 task supervisor gần nhất
- `recentDecisions`: 20 quyết định gần nhất
- `workspaces`: danh sách workspace + supervisor enabled/disabled
- `llmAvailable`: có OPENAI_API_KEY hay không

### Phân loại lỗi tự động

Supervisor tự nhận diện loại lỗi và đề xuất xử lý:

| Loại lỗi | Hành động |
|-----------|----------|
| Token hết hạn | Re-authenticate |
| Rate limit | Backoff 60s rồi retry |
| Content policy vi phạm | Chuyển review queue |
| Network error | Retry sau 10s |
| Schema drift | Escalate cho admin |
| Missing config | Escalate cho admin |

### Governance policies

| Risk level | Task labels | Auto-approve? |
|-----------|------------|---------------|
| Low | discover, draft, health-check, supervisor:* | Luôn auto |
| Medium | engage | Auto |
| High | post | Chỉ auto khi mode = `live` |

### Có và không có OPENAI_API_KEY

| Feature | Có key | Không key |
|---------|--------|-----------|
| Plan tasks | LLM reasoning (GPT-4o) | Rule-based matching |
| Monitor | Same logic | Same logic |
| Report | LLM executive summary | Structured text summary |
| Failure classification | Same logic | Same logic |

Hệ thống hoạt động hoàn toàn không cần OpenAI — LLM chỉ nâng cấp chất lượng plan/report.

---

## 10. API Reference tóm tắt

### Headers bắt buộc

```
x-api-key: <INTERNAL_API_KEY>
x-organization-id: org-1          # (tùy chọn, mặc định org-1)
x-workspace-id: <workspace-id>    # (cho endpoint cần workspace scope)
Content-Type: application/json
```

### Endpoint chính

| Category | Endpoint | Method |
|----------|----------|--------|
| **Workspace** | `/api/v1/workspaces` | GET, POST |
| | `/api/v1/workspaces/:id` | GET, PATCH, DELETE |
| **Tasks** | `/api/v1/tasks` | GET, POST |
| | `/api/v1/tasks/:id` | GET, PATCH, DELETE |
| **Agents** | `/api/v1/agents` | GET, POST |
| **Departments** | `/api/v1/departments` | GET, POST |
| **Projects** | `/api/v1/projects` | GET, POST |
| **Approvals** | `/api/v1/approvals` | GET, POST |
| **Logs** | `/api/v1/logs` | GET, POST |
| **Fanpage** | `/api/v1/fanpage/status` | GET |
| | `/api/v1/fanpage/config` | GET, PATCH |
| **Supervisor** | `/api/v1/supervisor/status` | GET |
| | `/api/v1/supervisor/plan` | POST |
| **Drafts** | `/api/v1/drafts` | GET, POST |
| | `/api/v1/drafts/:id` | GET, PATCH, DELETE |
| **System** | `/api/v1/system/health` | GET (no auth) |
| | `/api/v1/system/stats` | GET |

Xem chi tiết: [`docs/lilbin/API.md`](./lilbin/API.md)

---

## 11. Dashboard UI

Truy cập tại `http://localhost:3000` (dev) hoặc URL Vercel (production).

### Các trang chính

| Trang | Đường dẫn | Chức năng |
|-------|-----------|----------|
| Dashboard | `/` | Tổng quan KPI |
| Workspaces | `/workspaces` | Quản lý workspace |
| Tasks | `/tasks` | Danh sách task, filter by status/priority |
| Agents | `/agents` | Quản lý AI agents |
| Departments | `/departments` | Quản lý phòng ban |
| Projects | `/projects` | Quản lý dự án |
| Approvals | `/approvals` | Duyệt task cần approval |
| Fanpage | `/modules/fanpage` | Dashboard fanpage automation |
| Logs | `/logs` | Xem activity logs |
| Knowledge | `/knowledge` | Memory, SOPs, Prompts |
| Settings | `/settings` | Cài đặt |

### Workspace switcher

Sidebar có workspace selector — chọn workspace để scope toàn bộ dashboard.

---

## 12. Deploy lên Production (Vercel)

### Dashboard + API (Vercel)

1. Push code lên GitHub
2. Import project vào Vercel
3. Set environment variables:
   - `DATABASE_URL` (Neon / Supabase / external Postgres)
   - `INTERNAL_API_KEY`
   - `OPENAI_API_KEY` (tùy chọn)
4. Vercel tự build và deploy

### Runner (Mac mini)

Runner **không** chạy trên Vercel — chạy trên Mac mini:

```bash
# Trên Mac mini
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy

# Chạy runner
pm2 start npx --name lilbin-runner -- tsx scripts/run-worker.ts --target MAC_MINI
```

### Database

Khuyến nghị cho production:
- **Neon** (free tier ok cho bắt đầu)
- **Supabase** (có dashboard)
- **Railway** (dễ setup)

Cùng một `DATABASE_URL` cho cả Vercel (API) và Mac mini (runner).

---

## 13. Mở rộng đa ngành

### Tạo workspace cho ngành mới

```bash
# Photography business
curl -X POST /api/v1/workspaces -H "x-api-key: $KEY" \
  -d '{"name": "Bros Photo Studio", "slug": "bros-photo", "type": "CLIENT", "templateId": "client_core"}'

# Trucking company
curl -X POST /api/v1/workspaces -H "x-api-key: $KEY" \
  -d '{"name": "ABC Trucking", "slug": "abc-trucking", "type": "CLIENT", "templateId": "client_core"}'

# Roofing business
curl -X POST /api/v1/workspaces -H "x-api-key: $KEY" \
  -d '{"name": "Roofing Pro", "slug": "roofing-pro", "type": "CLIENT", "templateId": "client_core"}'

# Realtor
curl -X POST /api/v1/workspaces -H "x-api-key: $KEY" \
  -d '{"name": "Agent Smith Realty", "slug": "smith-realty", "type": "CLIENT", "templateId": "client_core"}'

# Fanpage
curl -X POST /api/v1/workspaces -H "x-api-key: $KEY" \
  -d '{"name": "Tai Dinh Fanpage", "slug": "tai-dinh-fp", "type": "CLIENT", "templateId": "fanpage_growth"}'
```

### Giao việc cho supervisor

```bash
# Supervisor tự lập kế hoạch cho từng workspace
curl -X POST /api/v1/supervisor/plan -H "x-api-key: $KEY" \
  -d '{"workspaceId": "ws-bros-photo", "objective": "Đẩy content Facebook tuần này"}'

curl -X POST /api/v1/supervisor/plan -H "x-api-key: $KEY" \
  -d '{"workspaceId": "ws-abc-trucking", "objective": "Kiểm tra health hệ thống và báo cáo"}'

curl -X POST /api/v1/supervisor/plan -H "x-api-key: $KEY" \
  -d '{"workspaceId": "ws-roofing-pro", "objective": "Tạo estimate mới và follow up leads"}'
```

### Mỗi workspace tự vận hành

Sau khi supervisor plan xong, runner tự động:
1. Claim subtasks từ queue
2. Dispatch đến đúng executor
3. Xử lý (discover/draft/post/engage/health-check)
4. Log kết quả
5. Monitor tự phát hiện lỗi
6. Report tự tổng hợp

Bạn chỉ cần xem kết quả trên Dashboard hoặc qua API.

---

## 14. Xử lý sự cố

### Runner không chạy

```bash
# Kiểm tra runner process
pm2 status

# Xem log
pm2 logs lilbin-runner --lines 50

# Restart
pm2 restart lilbin-runner
```

### Task bị stuck ở RUNNING

Runner tự recover stale tasks mỗi 12 cycle (~60 giây). Nếu cần manual:

```bash
# Qua API — PATCH task status về QUEUED
curl -X PATCH /api/v1/tasks/<task-id> \
  -H "x-api-key: $KEY" \
  -d '{"status": "QUEUED"}'
```

### Facebook post không publish

Checklist:
1. Mode phải là `live` (không phải `review` hay `dry_run`)
2. Draft phải ở status `APPROVED` hoặc `SCHEDULED`
3. `scheduledAt` phải <= now (hoặc null)
4. `IntegrationAccount` phải có `accessToken` hợp lệ
5. Runner log phải hiện: `[runner] Dispatching task <id> to executor "fanpage:post"`
6. Nếu log hiện `falling back to "default"` → runner chạy code cũ, cần `git pull` + restart

### Database migration

```bash
# Sau khi pull code mới
npx prisma generate
npx prisma migrate deploy    # production-safe, không mất data
```

### Build lỗi

```bash
npx prisma generate    # đảm bảo Prisma client up-to-date
npm run build          # xem lỗi cụ thể
```

---

## 15. Câu hỏi thường gặp

### Deploy lại có mất data không?

**Không.** Database nằm trên PostgreSQL riêng biệt. Deploy Vercel chỉ thay code app, không đụng DB. Tuy nhiên, nếu schema thay đổi, cần chạy `prisma migrate deploy` trên production.

### Supervisor có bắt buộc OPENAI_API_KEY không?

**Không.** Không có key thì supervisor dùng rule-based logic. Có key thì dùng GPT-4o cho planning/reporting thông minh hơn.

### Có thể chạy nhiều runner không?

**Có.** Mỗi runner dùng `runnerId` riêng và atomic locking (claim task) nên không bị duplicate execution.

### Làm sao tắt supervisor cho workspace cụ thể?

Set `metadata.useLangGraph = false` trên workspace đó:

```bash
curl -X PATCH /api/v1/workspaces/<id> \
  -H "x-api-key: $KEY" \
  -d '{"metadata": {"useLangGraph": false}}'
```

### Fanpage mode mặc định là gì?

`review` — draft được tạo nhưng không tự đăng. Phải approve thủ công hoặc đổi sang `live`.

### Mac mini mất mạng thì sao?

Runner sẽ gặp DB connection error, log lỗi, và retry ở cycle tiếp theo. Khi mạng khôi phục, runner tự hoạt động lại. Tasks bị stuck sẽ được stale lock recovery xử lý.

### Tôi muốn thêm executor mới cho ngành khác?

Tạo file trong `src/lib/executors/`, implement `ExecutorFn`, rồi register trong runner:

```typescript
// src/lib/executors/roofing-estimate.ts
import type { ExecutorFn } from "../runner";

export const roofingEstimateExecutor: ExecutorFn = async (task, prisma) => {
  // Logic xử lý estimate
  return { output: { estimateId: "...", total: 5000 } };
};

// Trong scripts/run-worker.ts
import { roofingEstimateExecutor } from "../src/lib/executors/roofing-estimate";
registerExecutor("roofing:estimate", roofingEstimateExecutor);
```

---

## Quick Start (1 phút)

```bash
git clone https://github.com/dtt1904/lil-bin-comp.git
cd lil-bin-comp
npm run setup:demo
npm run dev
# Mở http://localhost:3000

# Chạy runner (terminal khác)
npm run runner:mac
```

Xong. Hệ thống đã chạy với supervisor tự giám sát mọi workspace.
