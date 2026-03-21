import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { WorkspaceType } from "@/generated/prisma/enums";

const VALID_WORKSPACE_TYPES = Object.values(WorkspaceType);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        _count: {
          select: { departments: true, agents: true, tasks: true, projects: true },
        },
      },
    });

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    const { _count, ...rest } = workspace;
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

  const { name, slug, type, description } = body as {
    name?: string;
    slug?: string;
    type?: string;
    description?: string;
  };

  if (type && !VALID_WORKSPACE_TYPES.includes(type as WorkspaceType)) {
    return errorResponse(
      `Invalid type. Must be one of: ${VALID_WORKSPACE_TYPES.join(", ")}`,
      400
    );
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (slug !== undefined) data.slug = slug;
  if (type !== undefined) data.type = type as WorkspaceType;
  if (description !== undefined) data.description = description;

  try {
    const updated = await prisma.workspace.update({
      where: { id },
      data,
    });

    return jsonResponse({ data: updated });
  } catch (e: any) {
    if (e.code === "P2025") return errorResponse("Workspace not found", 404);
    if (e.code === "P2002") {
      return errorResponse(
        `Workspace with slug "${slug}" already exists`,
        409
      );
    }
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
    await prisma.workspace.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") return errorResponse("Workspace not found", 404);
    return errorResponse("Internal error", 500);
  }
}
