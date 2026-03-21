import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { ApprovalStatus, LogLevel, Severity } from "@/generated/prisma/enums";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const offset = parseInt(params.offset || "0", 10) || 0;

  try {
    const where: Record<string, unknown> = {};

    if (params.status) where.status = params.status as ApprovalStatus;
    if (params.taskId) where.taskId = params.taskId;
    if (params.workspaceId) {
      where.task = { workspaceId: params.workspaceId };
    }

    const [data, total] = await Promise.all([
      prisma.approval.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.approval.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset } });
  } catch (err) {
    return errorResponse(`Failed to fetch approvals: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.taskId || !body.requestedById) {
    return errorResponse("taskId and requestedById are required");
  }

  try {
    const task = await prisma.task.findUnique({ where: { id: body.taskId } });
    if (!task) return errorResponse("Task not found", 404);

    const approval = await prisma.approval.create({
      data: {
        taskId: body.taskId,
        requestedById: body.requestedById,
        title: body.title ?? `Approval for: ${task.title}`,
        description: body.reason ?? body.description ?? undefined,
        status: ApprovalStatus.PENDING,
        severity: (body.severity as Severity) ?? Severity.MEDIUM,
      },
    });

    await prisma.notification.create({
      data: {
        type: "approval_request",
        userId: task.createdByUserId ?? undefined,
        organizationId: task.organizationId,
        workspaceId: task.workspaceId,
        title: "New Approval Request",
        message: `Approval requested for task "${task.title}"${body.reason ? `: ${body.reason}` : ""}`,
        severity: (body.severity as Severity) ?? Severity.MEDIUM,
        link: `/approvals/${approval.id}`,
      },
    });

    await prisma.logEvent.create({
      data: {
        organizationId: task.organizationId,
        workspaceId: task.workspaceId,
        taskId: body.taskId,
        level: LogLevel.INFO,
        source: "api",
        message: `Approval ${approval.id} requested by ${body.requestedById}`,
      },
    });

    return jsonResponse({ data: approval }, 201);
  } catch (err) {
    return errorResponse(`Failed to create approval: ${err instanceof Error ? err.message : err}`, 500);
  }
}
