import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import {
  TaskStatus,
  TaskPriority,
  LogLevel,
} from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const offset = parseInt(params.offset || "0", 10) || 0;

  let results = store.tasks;

  if (params.workspaceId) {
    results = store.filter(results, (t) => t.workspaceId === params.workspaceId);
  }
  if (params.projectId) {
    results = store.filter(results, (t) => t.projectId === params.projectId);
  }
  if (params.agentId) {
    results = store.filter(results, (t) => t.agentId === params.agentId);
  }
  if (params.status) {
    results = store.filter(results, (t) => t.status === params.status);
  }
  if (params.priority) {
    results = store.filter(results, (t) => t.priority === params.priority);
  }

  const total = results.length;
  const data = results.slice(offset, offset + limit);

  return jsonResponse({ data, meta: { total, limit, offset } });
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.workspaceId || !body.title) {
    return errorResponse("workspaceId and title are required");
  }

  const workspace = store.findById(store.workspaces, body.workspaceId);
  if (!workspace) {
    return errorResponse("Workspace not found", 404);
  }

  if (body.projectId) {
    const project = store.findById(store.projects, body.projectId);
    if (!project) return errorResponse("Project not found", 404);
  }
  if (body.agentId) {
    const agent = store.findById(store.agents, body.agentId);
    if (!agent) return errorResponse("Agent not found", 404);
  }
  if (body.assignedToUserId) {
    const user = store.findById(store.users, body.assignedToUserId);
    if (!user) return errorResponse("Assigned user not found", 404);
  }
  if (body.parentTaskId) {
    const parent = store.findById(store.tasks, body.parentTaskId);
    if (!parent) return errorResponse("Parent task not found", 404);
  }

  const now = new Date();
  const task = store.insert(store.tasks, {
    id: generateId("task"),
    workspaceId: body.workspaceId,
    projectId: body.projectId ?? undefined,
    agentId: body.agentId ?? undefined,
    assignedToUserId: body.assignedToUserId ?? undefined,
    parentTaskId: body.parentTaskId ?? undefined,
    title: body.title,
    description: body.description ?? undefined,
    status: body.status ?? TaskStatus.BACKLOG,
    priority: body.priority ?? TaskPriority.MEDIUM,
    dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    estimatedTokens: body.estimatedTokens ?? undefined,
    tags: body.tags ?? [],
    metadata: body.metadata ?? undefined,
    createdAt: now,
    updatedAt: now,
  });

  store.insert(store.logEvents, {
    id: generateId("log"),
    organizationId: auth.ctx.organizationId,
    workspaceId: task.workspaceId,
    taskId: task.id,
    agentId: task.agentId,
    level: LogLevel.INFO,
    message: `Task created: ${task.title}`,
    timestamp: now,
  });

  return jsonResponse({ data: task }, 201);
}
