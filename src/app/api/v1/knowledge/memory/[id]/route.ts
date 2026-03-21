import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const entry = await prisma.memoryEntry.findUnique({ where: { id } });
    if (!entry) return errorResponse("Memory entry not found", 404);

    return jsonResponse({ data: entry });
  } catch (err) {
    return errorResponse(`Failed to fetch memory entry: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const existing = await prisma.memoryEntry.findUnique({ where: { id } });
    if (!existing) return errorResponse("Memory entry not found", 404);

    const body = await req.json();

    const updated = await prisma.memoryEntry.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.visibility !== undefined && { visibility: body.visibility }),
        ...(body.tags !== undefined && { tags: body.tags }),
      },
    });

    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse(`Failed to update memory entry: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const existing = await prisma.memoryEntry.findUnique({ where: { id } });
    if (!existing) return errorResponse("Memory entry not found", 404);

    await prisma.memoryEntry.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse(`Failed to delete memory entry: ${err instanceof Error ? err.message : err}`, 500);
  }
}
