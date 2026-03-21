import { NextRequest } from "next/server";
import { store } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const notification = store.findById(store.notifications, id);
  if (!notification) return errorResponse("Notification not found", 404);

  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.isRead !== undefined) updates.isRead = body.isRead;

  const updated = store.update(store.notifications, id, updates);
  return jsonResponse({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const notification = store.findById(store.notifications, id);
  if (!notification) return errorResponse("Notification not found", 404);

  store.remove(store.notifications, id);
  return jsonResponse({ success: true });
}
