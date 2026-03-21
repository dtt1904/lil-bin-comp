import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { store } from "@/lib/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const entry = store.findById(store.memoryEntries, id);
  if (!entry) return errorResponse("Memory entry not found", 404);

  return jsonResponse({ data: entry });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.memoryEntries, id);
  if (!existing) return errorResponse("Memory entry not found", 404);

  const body = await req.json();
  const updated = store.update(store.memoryEntries, id, {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.content !== undefined && { content: body.content }),
    ...(body.type !== undefined && { type: body.type }),
    ...(body.visibility !== undefined && { visibility: body.visibility }),
    ...(body.tags !== undefined && { tags: body.tags }),
    updatedAt: new Date(),
  });

  return jsonResponse({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const removed = store.remove(store.memoryEntries, id);
  if (!removed) return errorResponse("Memory entry not found", 404);

  return jsonResponse({ success: true });
}
