import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import {
  TaskStatus,
  ApprovalStatus,
  LogLevel,
  Severity,
  ExecutionTarget,
} from "@/generated/prisma/enums";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        taskRuns: true,
        comments: true,
        dependsOn: true,
        approvals: true,
      },
    });
    if (!task) return errorResponse("Task not found", 404);

    return jsonResponse({ data: task });
  } catch (err) {
    return errorResponse(`Failed to fetch task: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return errorResponse("Task not found", 404);

    const body = await req.json();
    const oldStatus = task.status;

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status as TaskStatus;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.assigneeAgentId !== undefined) updateData.assigneeAgentId = body.assigneeAgentId;
    if (body.agentId !== undefined) updateData.assigneeAgentId = body.agentId;
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.labels !== undefined) updateData.labels = body.labels;
    if (body.tags !== undefined) updateData.labels = body.tags;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.estimatedCost !== undefined) updateData.estimatedCost = body.estimatedCost;
    if (body.actualCost !== undefined) updateData.actualCost = body.actualCost;
    if (body.executionTarget !== undefined) updateData.executionTarget = body.executionTarget as ExecutionTarget;
    if (body.maxRetries !== undefined) updateData.maxRetries = body.maxRetries;

    const updated = await prisma.task.update({ where: { id }, data: updateData });

    if (body.status && body.status !== oldStatus) {
      await prisma.logEvent.create({
        data: {
          organizationId: task.organizationId,
          workspaceId: task.workspaceId,
          taskId: id,
          agentId: task.assigneeAgentId,
          level: LogLevel.INFO,
          source: "api",
          message: `Task status changed: ${oldStatus} → ${body.status}`,
        },
      });

      if (body.status === TaskStatus.AWAITING_APPROVAL) {
        const approval = await prisma.approval.create({
          data: {
            taskId: id,
            requestedById: task.assigneeAgentId || "system",
            title: `Approval for: ${task.title}`,
            status: ApprovalStatus.PENDING,
            severity: Severity.MEDIUM,
          },
        });

        await prisma.notification.create({
          data: {
            type: "approval_required",
            userId: task.createdByUserId ?? undefined,
            organizationId: task.organizationId,
            workspaceId: task.workspaceId,
            title: "Approval Required",
            message: `Task "${task.title}" requires approval`,
            severity: Severity.HIGH,
            link: `/tasks/${id}`,
          },
        });

        await prisma.logEvent.create({
          data: {
            organizationId: task.organizationId,
            workspaceId: task.workspaceId,
            taskId: id,
            level: LogLevel.INFO,
            source: "api",
            message: `Approval ${approval.id} auto-created for task`,
          },
        });
      }
    }

    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse(`Failed to update task: ${err instanceof Error ? err.message : err}`, 500);
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
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return errorResponse("Task not found", 404);

    await prisma.task.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse(`Failed to delete task: ${err instanceof Error ? err.message : err}`, 500);
  }
}
