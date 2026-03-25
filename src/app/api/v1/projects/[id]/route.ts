import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { ProjectStatus } from "@/generated/prisma/enums";

const VALID_STATUSES = Object.values(ProjectStatus);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    const [taskCount, tasksByStatusRaw, tasksWithAgents] = await Promise.all([
      prisma.task.count({ where: { projectId: id } }),
      prisma.task.groupBy({
        by: ["status"],
        where: { projectId: id },
        _count: true,
      }),
      prisma.task.findMany({
        where: { projectId: id, assigneeAgentId: { not: null } },
        select: { assigneeAgentId: true },
        distinct: ["assigneeAgentId"],
      }),
    ]);

    const tasksByStatus: Record<string, number> = {};
    for (const row of tasksByStatusRaw) {
      tasksByStatus[row.status] = row._count;
    }

    const agentIds = tasksWithAgents
      .map((t) => t.assigneeAgentId!)
      .filter(Boolean);
    const agents =
      agentIds.length > 0
        ? await prisma.agent.findMany({ where: { id: { in: agentIds } } })
        : [];

    return jsonResponse({
      data: {
        ...project,
        _counts: {
          tasks: taskCount,
          tasksByStatus,
        },
        agents,
      },
    });
  } catch (err) {
    console.error("[projects] operation failed:", err);
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
    console.error("[projects] operation failed:", err);
    return errorResponse("Invalid JSON body", 400);
  }

  const { name, description, status, workspaceId, departmentId, slug } =
    body as {
      name?: string;
      description?: string;
      status?: string;
      workspaceId?: string;
      departmentId?: string;
      slug?: string;
    };

  if (status && !VALID_STATUSES.includes(status as ProjectStatus)) {
    return errorResponse(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

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
      console.error("[projects] operation failed:", err);
      return errorResponse(
        `Failed: ${err instanceof Error ? err.message : "unknown"}`,
        500
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (slug !== undefined) data.slug = slug;
  if (description !== undefined) data.description = description;
  if (status !== undefined) data.status = status as ProjectStatus;
  if (workspaceId !== undefined) data.workspaceId = workspaceId;
  if (departmentId !== undefined) data.departmentId = departmentId;

  try {
    const updated = await prisma.project.update({
      where: { id },
      data,
    });

    return jsonResponse({ data: updated });
  } catch (err: any) {
    console.error("[projects] operation failed:", err);
    if (err.code === "P2025") return errorResponse("Project not found", 404);
    if (err.code === "P2002")
      return errorResponse("Unique constraint violation", 409);
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
    await prisma.project.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (err: any) {
    console.error("[projects] operation failed:", err);
    if (err.code === "P2025") return errorResponse("Project not found", 404);
    return errorResponse(
      `Failed: ${err instanceof Error ? err.message : "unknown"}`,
      500
    );
  }
}
