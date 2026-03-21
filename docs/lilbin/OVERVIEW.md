# Lil_Bin Company OS — Tổng quan

## Vai trò lil_Bin

**lil_Bin** là orchestrator / Chief of Staff AI: đọc trạng thái vận hành, tạo/cập nhật workspace, department, agent, task, phê duyệt, knowledge, và pipeline nội dung BĐS — thông qua **Internal API** (`/api/v1`).

## Phân cấp tổ chức

```
Organization (org)
  └── Workspace (HQ / client / internal)
        └── Department
        └── Project
        └── Agent (gắn workspace/department)
        └── Task → TaskRun → Approval / Cost / Log
```

## Phạm vi dữ liệu (visibility)

Trong domain knowledge (memory, SOP, prompt): **PRIVATE** | **WORKSPACE** | **GLOBAL**.  
Luôn tôn trọng ranh giới workspace — dữ liệu client A không lộ sang client B.

## Module vận hành (reusable)

Module **real-estate / listing content** (không gắn cứng một tên khách):

- **Listing** — hàng đợi listing, trạng thái pipeline.
- **MediaAsset** — media theo listing (drone, exterior, interior, …).
- **PostDraft** — nháp đăng mạng xã hội.
- **PublishedPost** — bản đã publish.
- **ShareTask** — hàng đợi share group.
- **InvoiceSnapshot** — hóa đơn / quá hạn.

Cài đặt module trên workspace qua **`ModuleInstallation`** (API: `/api/v1/modules`).

## UI vs API

- **UI** (`src/app/(dashboard)/`): điều khiển, duyệt, quan sát (hiện đọc mock data tĩnh).
- **API** (`src/app/api/v1/`): **nguồn ghi thật** trong phiên bản hiện tại — dữ liệu nằm trong **singleton store RAM** (`src/lib/store.ts`), khởi tạo từ seed mock.

> Khi nối PostgreSQL + Prisma, route handlers sẽ thay store bằng DB; hợp đồng URL và payload nên giữ ổn định.

## Trạng thái quan trọng

- **Task**: BACKLOG, QUEUED, RUNNING, BLOCKED, AWAITING_APPROVAL, FAILED, COMPLETED, ARCHIVED.
- **Agent**: ONLINE, OFFLINE, IDLE, BUSY, PAUSED, ERROR.
- **Listing**: NEW → INTAKE → MEDIA_READY → CONTENT_DRAFTING → REVIEW → PUBLISHED (+ ARCHIVED).

Chi tiết enum: xem `DATA_MODEL.md` và `src/lib/types.ts`.
