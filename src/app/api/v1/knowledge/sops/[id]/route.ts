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
    const doc = await prisma.sOPDocument.findUnique({ where: { id } });
    if (!doc) return errorResponse("SOP not found", 404);

    return jsonResponse({ data: doc });
  } catch (err) {
    return errorResponse(`Failed to fetch SOP: ${err instanceof Error ? err.message : err}`, 500);
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
    const existing = await prisma.sOPDocument.findUnique({ where: { id } });
    if (!existing) return errorResponse("SOP not found", 404);

    const body = await req.json();

    const contentChanged =
      body.content !== undefined && body.content !== existing.content;

    const updated = await prisma.sOPDocument.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.visibility !== undefined && { visibility: body.visibility }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(contentChanged && { version: existing.version + 1 }),
      },
    });

    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse(`Failed to update SOP: ${err instanceof Error ? err.message : err}`, 500);
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
    const existing = await prisma.sOPDocument.findUnique({ where: { id } });
    if (!existing) return errorResponse("SOP not found", 404);

    await prisma.sOPDocument.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse(`Failed to delete SOP: ${err instanceof Error ? err.message : err}`, 500);
  }
}
