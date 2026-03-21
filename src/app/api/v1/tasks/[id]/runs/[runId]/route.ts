import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { TaskRunStatus, TaskStatus, LogLevel } from "@/generated/prisma/enums";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id, runId } = await params;

  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return errorResponse("Task not found", 404);

    const run = await prisma.taskRun.findUnique({ where: { id: runId } });
    if (!run || run.taskId !== id) return errorResponse("Task run not found", 404);

    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) updates.status = body.status as TaskRunStatus;
    if (body.output !== undefined) updates.output = body.output;
    if (body.error !== undefined) updates.error = body.error;
    if (body.errorMessage !== undefined) updates.error = body.errorMessage;

    if (body.tokensUsed !== undefined) {
      updates.tokensUsed = body.tokensUsed;
    } else if (body.outputTokens !== undefined) {
      updates.tokensUsed = (run.tokensUsed ?? 0) + body.outputTokens;
    }

    if (body.costUsd !== undefined) updates.cost = body.costUsd;
    if (body.cost !== undefined) updates.cost = body.cost;

    if (body.status === TaskRunStatus.COMPLETED || body.status === TaskRunStatus.FAILED) {
      updates.completedAt = new Date();
    }

    const updatedRun = await prisma.taskRun.update({ where: { id: runId }, data: updates });

    if (body.status === TaskRunStatus.COMPLETED) {
      await prisma.task.update({ where: { id }, data: { status: TaskStatus.COMPLETED } });

      const costVal = body.costUsd ?? body.cost;
      if (costVal && costVal > 0) {
        const agent = await prisma.agent.findUnique({ where: { id: run.agentId } });
        await prisma.costRecord.create({
          data: {
            organizationId: task.organizationId,
            workspaceId: task.workspaceId,
            agentId: run.agentId,
            taskId: id,
            taskRunId: runId,
            model: agent?.model ?? "unknown",
            provider: agent?.provider ?? "unknown",
            tokensInput: 0,
            tokensOutput: body.outputTokens ?? 0,
            cost: costVal,
          },
        });
      }

      await prisma.logEvent.create({
        data: {
          organizationId: task.organizationId,
          workspaceId: task.workspaceId,
          taskId: id,
          agentId: run.agentId,
          level: LogLevel.INFO,
          source: "api",
          message: `Task run ${runId} completed`,
        },
      });
    }

    if (body.status === TaskRunStatus.FAILED) {
      await prisma.task.update({ where: { id }, data: { status: TaskStatus.FAILED } });

      await prisma.logEvent.create({
        data: {
          organizationId: task.organizationId,
          workspaceId: task.workspaceId,
          taskId: id,
          agentId: run.agentId,
          level: LogLevel.ERROR,
          source: "api",
          message: `Task run ${runId} failed${body.errorMessage ? `: ${body.errorMessage}` : ""}`,
        },
      });
    }

    return jsonResponse({ data: updatedRun });
  } catch (err) {
    return errorResponse(`Failed to update run: ${err instanceof Error ? err.message : err}`, 500);
  }
}
