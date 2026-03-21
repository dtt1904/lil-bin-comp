import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const approval = await prisma.approval.findUnique({
      where: { id },
      include: { task: true },
    });
    if (!approval) return errorResponse("Approval not found", 404);

    return jsonResponse({ data: approval });
  } catch (err) {
    return errorResponse(`Failed to fetch approval: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const approval = await prisma.approval.findUnique({ where: { id } });
    if (!approval) return errorResponse("Approval not found", 404);

    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const updated = await prisma.approval.update({ where: { id }, data: updateData });

    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse(`Failed to update approval: ${err instanceof Error ? err.message : err}`, 500);
  }
}
