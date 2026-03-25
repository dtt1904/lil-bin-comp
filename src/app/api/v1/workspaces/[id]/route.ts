import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { WorkspaceType } from "@/generated/prisma/enums";

const VALID_WORKSPACE_TYPES = Object.values(WorkspaceType);

const WORKSPACE_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  type: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const workspace = await prisma.workspace.findFirst({
      where: { id, organizationId: auth.ctx.organizationId },
      select: {
        ...WORKSPACE_SELECT,
        _count: {
          select: {
            departments: true,
            agents: true,
            tasks: true,
            projects: true,
          },
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
  } catch (err) {
    console.error("[workspace GET] failed:", err);
    return errorResponse(
      `Failed to fetch workspace: ${err instanceof Error ? err.message : "unknown"}`,
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
    const owns = await prisma.workspace.findFirst({
      where: { id, organizationId: auth.ctx.organizationId },
      select: { id: true },
    });
    if (!owns) return errorResponse("Workspace not found", 404);

    const updated = await prisma.workspace.update({
      where: { id },
      data,
      select: WORKSPACE_SELECT,
    });

    return jsonResponse({ data: updated });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    console.error("[workspace PATCH] failed:", e);
    if (err.code === "P2025") return errorResponse("Workspace not found", 404);
    if (err.code === "P2002") {
      return errorResponse(
        `Workspace with slug "${slug}" already exists`,
        409
      );
    }
    return errorResponse(
      `Failed to update workspace: ${err.message ?? "unknown"}`,
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
    const owns = await prisma.workspace.findFirst({
      where: { id, organizationId: auth.ctx.organizationId },
      select: { id: true },
    });
    if (!owns) return errorResponse("Workspace not found", 404);

    await prisma.workspace.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    console.error("[workspace DELETE] failed:", e);
    if (err.code === "P2025") return errorResponse("Workspace not found", 404);
    return errorResponse(
      `Failed to delete workspace: ${err.message ?? "unknown"}`,
      500
    );
  }
}
