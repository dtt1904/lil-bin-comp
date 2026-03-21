import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { TaskRunStatus, TaskStatus, LogLevel } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const task = store.findById(store.tasks, id);
  if (!task) return errorResponse("Task not found", 404);

  const runs = store.filter(store.taskRuns, (r) => r.taskId === id);
  return jsonResponse({ data: runs, meta: { total: runs.length } });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const task = store.findById(store.tasks, id);
  if (!task) return errorResponse("Task not found", 404);

  const body = await req.json();

  if (!body.agentId) {
    return errorResponse("agentId is required");
  }

  const agent = store.findById(store.agents, body.agentId);
  if (!agent) return errorResponse("Agent not found", 404);

  const now = new Date();
  const status = body.status ?? TaskRunStatus.STARTED;
  const isTerminal = status === TaskRunStatus.COMPLETED || status === TaskRunStatus.FAILED;

  const run = store.insert(store.taskRuns, {
    id: generateId("run"),
    taskId: id,
    agentId: body.agentId,
    status,
    inputTokens: body.inputTokens ?? undefined,
    outputTokens: body.outputTokens ?? undefined,
    costUsd: body.costUsd ?? undefined,
    resultSummary: body.resultSummary ?? undefined,
    startedAt: now,
    completedAt: isTerminal ? now : undefined,
  });

  if (body.costUsd && body.costUsd > 0) {
    store.insert(store.costRecords, {
      id: generateId("cost"),
      organizationId: auth.ctx.organizationId,
      workspaceId: task.workspaceId,
      agentId: body.agentId,
      taskRunId: run.id,
      model: agent.model,
      provider: agent.provider,
      inputTokens: body.inputTokens ?? 0,
      outputTokens: body.outputTokens ?? 0,
      costUsd: body.costUsd,
      recordedAt: now,
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
    store.update(store.tasks, id, { status: newTaskStatus, updatedAt: now });
  }

  store.insert(store.logEvents, {
    id: generateId("log"),
    organizationId: auth.ctx.organizationId,
    workspaceId: task.workspaceId,
    taskId: id,
    agentId: body.agentId,
    level: status === TaskRunStatus.FAILED ? LogLevel.ERROR : LogLevel.INFO,
    message: `Task run ${run.id} created with status ${status}`,
    timestamp: now,
  });

  return jsonResponse({ data: run }, 201);
}
