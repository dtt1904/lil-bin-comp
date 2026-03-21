import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { TaskRunStatus, TaskStatus, LogLevel } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id, runId } = await params;

  const task = store.findById(store.tasks, id);
  if (!task) return errorResponse("Task not found", 404);

  const run = store.findById(store.taskRuns, runId);
  if (!run || run.taskId !== id) return errorResponse("Task run not found", 404);

  const body = await req.json();
  const now = new Date();

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.outputTokens !== undefined) updates.outputTokens = body.outputTokens;
  if (body.costUsd !== undefined) updates.costUsd = body.costUsd;
  if (body.resultSummary !== undefined) updates.resultSummary = body.resultSummary;
  if (body.errorMessage !== undefined) updates.errorMessage = body.errorMessage;
  if (body.durationMs !== undefined) updates.durationMs = body.durationMs;

  if (body.status === TaskRunStatus.COMPLETED || body.status === TaskRunStatus.FAILED) {
    updates.completedAt = now;
  }

  const updatedRun = store.update(store.taskRuns, runId, updates);

  if (body.status === TaskRunStatus.COMPLETED) {
    store.update(store.tasks, id, { status: TaskStatus.COMPLETED, updatedAt: now });

    if (body.costUsd && body.costUsd > 0) {
      const agent = store.findById(store.agents, run.agentId);
      store.insert(store.costRecords, {
        id: generateId("cost"),
        organizationId: auth.ctx.organizationId,
        workspaceId: task.workspaceId,
        agentId: run.agentId,
        taskRunId: runId,
        model: agent?.model ?? "unknown",
        provider: agent?.provider ?? "unknown",
        inputTokens: run.inputTokens ?? 0,
        outputTokens: body.outputTokens ?? run.outputTokens ?? 0,
        costUsd: body.costUsd,
        recordedAt: now,
      });
    }

    store.insert(store.logEvents, {
      id: generateId("log"),
      organizationId: auth.ctx.organizationId,
      workspaceId: task.workspaceId,
      taskId: id,
      agentId: run.agentId,
      level: LogLevel.INFO,
      message: `Task run ${runId} completed`,
      timestamp: now,
    });
  }

  if (body.status === TaskRunStatus.FAILED) {
    store.update(store.tasks, id, { status: TaskStatus.FAILED, updatedAt: now });

    store.insert(store.logEvents, {
      id: generateId("log"),
      organizationId: auth.ctx.organizationId,
      workspaceId: task.workspaceId,
      taskId: id,
      agentId: run.agentId,
      level: LogLevel.ERROR,
      message: `Task run ${runId} failed${body.errorMessage ? `: ${body.errorMessage}` : ""}`,
      timestamp: now,
    });
  }

  return jsonResponse({ data: updatedRun });
}
