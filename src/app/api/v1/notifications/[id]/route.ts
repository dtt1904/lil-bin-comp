import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
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

  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return errorResponse("Notification not found", 404);

    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.isRead !== undefined) updates.read = body.isRead;
    if (body.read !== undefined) updates.read = body.read;

    const updated = await prisma.notification.update({ where: { id }, data: updates });
    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse(`Failed to update notification: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return errorResponse("Notification not found", 404);

    await prisma.notification.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse(`Failed to delete notification: ${err instanceof Error ? err.message : err}`, 500);
  }
}
