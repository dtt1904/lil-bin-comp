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
    const mod = await prisma.moduleInstallation.findUnique({ where: { id } });
    if (!mod) return errorResponse("Module installation not found", 404);

    return jsonResponse({ data: mod });
  } catch (err) {
    return errorResponse(`Failed to fetch module: ${err instanceof Error ? err.message : err}`, 500);
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
    const existing = await prisma.moduleInstallation.findUnique({ where: { id } });
    if (!existing) return errorResponse("Module installation not found", 404);

    const body = await req.json();
    const updated = await prisma.moduleInstallation.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.config !== undefined && { config: body.config }),
      },
    });

    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse(`Failed to update module: ${err instanceof Error ? err.message : err}`, 500);
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
    const existing = await prisma.moduleInstallation.findUnique({ where: { id } });
    if (!existing) return errorResponse("Module installation not found", 404);

    await prisma.moduleInstallation.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse(`Failed to delete module: ${err instanceof Error ? err.message : err}`, 500);
  }
}
