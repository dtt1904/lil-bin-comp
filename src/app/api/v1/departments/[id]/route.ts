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
  } catch (err) {
    console.error("[departments] operation failed:", err);
    return errorResponse(
      `Failed: ${err instanceof Error ? err.message : "unknown"}`,
      500
    );
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
  } catch (err) {
    console.error("[departments] operation failed:", err);
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
    } catch (err) {
      console.error("[departments] operation failed:", err);
      return errorResponse(
        `Failed: ${err instanceof Error ? err.message : "unknown"}`,
        500
      );
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
  } catch (err: any) {
    if (err.code === "P2025") return errorResponse("Department not found", 404);
    if (err.code === "P2002")
      return errorResponse("Unique constraint violation", 409);
    console.error("[departments] operation failed:", err);
    return errorResponse(
      `Failed: ${err instanceof Error ? err.message : "unknown"}`,
      500
    );
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
  } catch (err: any) {
    if (err.code === "P2025") return errorResponse("Department not found", 404);
    console.error("[departments] operation failed:", err);
    return errorResponse(
      `Failed: ${err instanceof Error ? err.message : "unknown"}`,
      500
    );
  }
}
