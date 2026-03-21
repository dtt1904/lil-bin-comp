# Mô hình dữ liệu

## Nguồn chân lý

| Layer | File | Ghi chú |
|-------|------|---------|
| TypeScript (UI + mock + store) | `src/lib/types.ts` | Interface + enum dùng trong app |
| Seed / demo | `src/lib/mock-data.ts` | Dữ liệu khởi tạo store |
| Runtime API (hiện tại) | `src/lib/store.ts` | Singleton, deep clone từ mock; API ghi vào đây |
| Database (chuẩn bị) | `prisma/schema.prisma` | Schema quan hệ đầy đủ cho Postgres |

Khi migrate sang Prisma, giữ **tên field và enum** gần với `types.ts` để API ít breaking change.

## Entity chính (tóm tắt)

- **Organization** — tổ chức gốc.
- **Workspace** — HQ / CLIENT / INTERNAL; chứa departments, projects, tasks scoped.
- **Department** — thuộc một workspace.
- **User** — người dùng, role OWNER…VIEWER.
- **Agent** — AI agent: `model`, `provider`, `systemPrompt`, `status`, `workspaceId?`, `departmentId?`.
- **AgentPermission** — quyền read/write/execute/approve theo workspace.
- **Project** — thuộc workspace; tasks có thể gắn `projectId`.
- **Task** — `status`, `priority`, `agentId?`, `dueDate?`, `tags`, `metadata`.
- **TaskDependency**, **TaskRun**, **Comment** — thực thi và collaboration.
- **Approval** — PENDING/APPROVED/DENIED; liên kết task.
- **LogEvent** — audit / debug theo level.
- **Notification** — thông báo cho user.
- **MemoryEntry**, **SOPDocument**, **PromptTemplate** — knowledge; `visibility`.
- **Artifact**, **Integration**, **CostRecord**, **AgentHeartbeat**.
- **ModuleInstallation** — module gắn workspace.
- **Listing**, **MediaAsset**, **PostDraft**, **PublishedPost**, **ShareTask**, **InvoiceSnapshot**, **IntegrationAccount** — module BĐS / vận hành.

## Enum thường dùng (API)

- **WorkspaceType**: HQ, CLIENT, INTERNAL  
- **TaskStatus**: BACKLOG, QUEUED, RUNNING, BLOCKED, AWAITING_APPROVAL, FAILED, COMPLETED, ARCHIVED  
- **TaskPriority**: CRITICAL, HIGH, MEDIUM, LOW  
- **AgentStatus**: ONLINE, OFFLINE, IDLE, BUSY, PAUSED, ERROR  
- **Visibility**: PRIVATE, WORKSPACE, GLOBAL  
- **ListingStatus**: NEW, INTAKE, MEDIA_READY, CONTENT_DRAFTING, REVIEW, PUBLISHED, ARCHIVED  
- **PostDraftStatus**: DRAFT, REVIEW, APPROVED, SCHEDULED, PUBLISHED, FAILED  
- **InvoiceStatus**: DRAFT, SENT, PAID, OVERDUE, CANCELLED  

Danh sách đầy đủ: `src/lib/types.ts`.

## ID

API tạo bản ghi mới dùng `generateId(prefix)` trong `store.ts` (prefix ví dụ: `ws`, `agent`, `task`, …).
