import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: { select: { agents: true, tasks: true } },
      },
    });

    if (!department) {
      return errorResponse("Department not found", 404);
    }

    const { _count, ...rest } = department;
    return jsonResponse({
      data: {
        ...rest,
        _counts: _count,
      },
    });
  } catch {
    return errorResponse("Internal error", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { name, description, workspaceId } = body as {
    name?: string;
    description?: string;
    workspaceId?: string;
  };

  if (workspaceId) {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
      if (!workspace) {
        return errorResponse(`Workspace "${workspaceId}" not found`, 400, {
          field: "workspaceId",
        });
      }
    } catch {
      return errorResponse("Internal error", 500);
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (workspaceId !== undefined) data.workspaceId = workspaceId;

  try {
    const updated = await prisma.department.update({
      where: { id },
      data,
    });

    return jsonResponse({ data: updated });
  } catch (e: any) {
    if (e.code === "P2025") return errorResponse("Department not found", 404);
    if (e.code === "P2002")
      return errorResponse("Unique constraint violation", 409);
    return errorResponse("Internal error", 500);
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
    await prisma.department.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") return errorResponse("Department not found", 404);
    return errorResponse("Internal error", 500);
  }
}
