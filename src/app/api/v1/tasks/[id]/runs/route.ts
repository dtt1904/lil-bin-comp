import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { TaskRunStatus, TaskStatus, LogLevel } from "@/generated/prisma/enums";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return errorResponse("Task not found", 404);

    const runs = await prisma.taskRun.findMany({
      where: { taskId: id },
      orderBy: { startedAt: "desc" },
    });

    return jsonResponse({ data: runs, meta: { total: runs.length } });
  } catch (err) {
    return errorResponse(`Failed to fetch runs: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function POST(
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

    if (!body.agentId) {
      return errorResponse("agentId is required");
    }

    const agent = await prisma.agent.findUnique({ where: { id: body.agentId } });
    if (!agent) return errorResponse("Agent not found", 404);

    const status = (body.status as TaskRunStatus) ?? TaskRunStatus.STARTED;
    const isTerminal = status === TaskRunStatus.COMPLETED || status === TaskRunStatus.FAILED;

    const tokensUsed =
      body.tokensUsed ?? (((body.inputTokens ?? 0) + (body.outputTokens ?? 0)) || undefined);

    const run = await prisma.taskRun.create({
      data: {
        taskId: id,
        agentId: body.agentId,
        status,
        input: body.input ?? undefined,
        output: body.output ?? undefined,
        tokensUsed,
        cost: body.costUsd ?? body.cost ?? undefined,
        completedAt: isTerminal ? new Date() : undefined,
      },
    });

    if ((body.costUsd ?? body.cost) && (body.costUsd ?? body.cost) > 0) {
      await prisma.costRecord.create({
        data: {
          organizationId: task.organizationId,
          workspaceId: task.workspaceId,
          agentId: body.agentId,
          taskId: id,
          taskRunId: run.id,
          model: agent.model,
          provider: agent.provider,
          tokensInput: body.inputTokens ?? 0,
          tokensOutput: body.outputTokens ?? 0,
          cost: body.costUsd ?? body.cost,
        },
      });
    }

    const taskStatusMap: Record<string, TaskStatus> = {
      [TaskRunStatus.STARTED]: TaskStatus.RUNNING,
      [TaskRunStatus.RUNNING]: TaskStatus.RUNNING,
      [TaskRunStatus.COMPLETED]: TaskStatus.COMPLETED,
      [TaskRunStatus.FAILED]: TaskStatus.FAILED,
    };
    const newTaskStatus = taskStatusMap[status];
    if (newTaskStatus) {
      await prisma.task.update({ where: { id }, data: { status: newTaskStatus } });
    }

    await prisma.logEvent.create({
      data: {
        organizationId: task.organizationId,
        workspaceId: task.workspaceId,
        taskId: id,
        agentId: body.agentId,
        level: status === TaskRunStatus.FAILED ? LogLevel.ERROR : LogLevel.INFO,
        source: "api",
        message: `Task run ${run.id} created with status ${status}`,
      },
    });

    return jsonResponse({ data: run }, 201);
  } catch (err) {
    return errorResponse(`Failed to create run: ${err instanceof Error ? err.message : err}`, 500);
  }
}
