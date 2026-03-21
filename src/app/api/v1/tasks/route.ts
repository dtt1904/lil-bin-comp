import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { TaskStatus, TaskPriority, LogLevel } from "@/generated/prisma/enums";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const offset = parseInt(params.offset || "0", 10) || 0;

  try {
    const where: Record<string, unknown> = {
      organizationId: auth.ctx.organizationId,
    };

    if (params.workspaceId) where.workspaceId = params.workspaceId;
    if (params.projectId) where.projectId = params.projectId;
    if (params.agentId) where.assigneeAgentId = params.agentId;
    if (params.status) where.status = params.status as TaskStatus;
    if (params.priority) where.priority = params.priority as TaskPriority;

    const [data, total] = await Promise.all([
      prisma.task.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.task.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset } });
  } catch (err) {
    return errorResponse(`Failed to fetch tasks: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.workspaceId || !body.title) {
    return errorResponse("workspaceId and title are required");
  }

  try {
    const workspace = await prisma.workspace.findUnique({ where: { id: body.workspaceId } });
    if (!workspace) return errorResponse("Workspace not found", 404);

    if (body.projectId) {
      const project = await prisma.project.findUnique({ where: { id: body.projectId } });
      if (!project) return errorResponse("Project not found", 404);
    }
    if (body.agentId) {
      const agent = await prisma.agent.findUnique({ where: { id: body.agentId } });
      if (!agent) return errorResponse("Agent not found", 404);
    }

    const task = await prisma.task.create({
      data: {
        organizationId: workspace.organizationId,
        workspaceId: body.workspaceId,
        projectId: body.projectId ?? undefined,
        assigneeAgentId: body.agentId ?? undefined,
        createdByUserId: body.assignedToUserId ?? undefined,
        title: body.title,
        description: body.description ?? undefined,
        status: (body.status as TaskStatus) ?? TaskStatus.BACKLOG,
        priority: (body.priority as TaskPriority) ?? TaskPriority.MEDIUM,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        labels: body.tags ?? [],
        estimatedCost: body.estimatedTokens ?? undefined,
      },
    });

    await prisma.logEvent.create({
      data: {
        organizationId: workspace.organizationId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        agentId: task.assigneeAgentId,
        level: LogLevel.INFO,
        source: "api",
        message: `Task created: ${task.title}`,
      },
    });

    return jsonResponse({ data: task }, 201);
  } catch (err) {
    return errorResponse(`Failed to create task: ${err instanceof Error ? err.message : err}`, 500);
  }
}
