# Tài liệu cho Lil_Bin (AI Operating Context)

Thư mục này là **bối cảnh chính thức** để agent **lil_Bin** (hoặc bất kỳ orchestrator AI nào) hiểu hệ thống **Lil_Bin Company OS** và vận hành qua API.

## Thứ tự đọc đề xuất

1. **[OVERVIEW.md](./OVERVIEW.md)** — Tầm nhìn, mô hình tổ chức, module vận hành.
2. **[RUNBOOK.md](./RUNBOOK.md)** — Chạy local, biến môi trường, health, reset dữ liệu.
3. **[API.md](./API.md)** — Toàn bộ endpoint `/api/v1`, auth, query/body mẫu.
4. **[DATA_MODEL.md](./DATA_MODEL.md)** — Entity, enum, nguồn chân lý TypeScript/Prisma.
5. **[CODE_MAP.md](./CODE_MAP.md)** — Đường dẫn file quan trọng trong repo.
6. **[TEAM_SETUP.md](./TEAM_SETUP.md)** — Quy trình setup team an toàn (live/demo tách biệt, tránh mất dữ liệu).

## Nguyên tắc vận hành

- **API-first**: Thao tác nghiệp vụ ưu tiên qua REST API có xác thực, không phụ thuộc UI.
- **Multi-tenant**: Luôn gắn `workspaceId` / `organizationId` khi tạo dữ liệu; dùng header `x-organization-id` khi cần (mặc định `org-1`).
- **Không hardcode một khách hàng**: Dữ liệu mẫu chỉ để dev; production dùng workspace/module linh hoạt.

## Liên hệ với code

| Nội dung | File trong repo |
|----------|-----------------|
| Xác thực API | `src/lib/api-auth.ts` |
| Store (RAM, mutable) | `src/lib/store.ts` |
| Kiểu dữ liệu UI/mock | `src/lib/types.ts`, `src/lib/mock-data.ts` |
| Schema DB (tương lai) | `prisma/schema.prisma` |
| Route handlers | `src/app/api/v1/**/route.ts` |
