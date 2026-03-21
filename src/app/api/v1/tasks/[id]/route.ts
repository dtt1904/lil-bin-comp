import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
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
} from "@/lib/types";

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
  const comments = store.filter(store.comments, (c) => c.taskId === id);
  const dependencies = store.filter(store.taskDependencies, (d) => d.taskId === id);
  const approvals = store.filter(store.approvals, (a) => a.taskId === id);

  return jsonResponse({
    data: { ...task, runs, comments, dependencies, approvals },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const task = store.findById(store.tasks, id);
  if (!task) return errorResponse("Task not found", 404);

  const body = await req.json();
  const now = new Date();
  const oldStatus = task.status;

  const updated = store.update(store.tasks, id, {
    ...body,
    updatedAt: now,
    ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}),
  });

  if (body.status && body.status !== oldStatus) {
    store.insert(store.logEvents, {
      id: generateId("log"),
      organizationId: auth.ctx.organizationId,
      workspaceId: task.workspaceId,
      taskId: id,
      agentId: task.agentId,
      level: LogLevel.INFO,
      message: `Task status changed: ${oldStatus} → ${body.status}`,
      timestamp: now,
    });

    if (body.status === TaskStatus.AWAITING_APPROVAL) {
      const approval = store.insert(store.approvals, {
        id: generateId("appr"),
        taskId: id,
        requestedById: task.agentId || task.assignedToUserId || "system",
        status: ApprovalStatus.PENDING,
        createdAt: now,
      });

      store.insert(store.notifications, {
        id: generateId("notif"),
        userId: task.assignedToUserId || auth.ctx.organizationId,
        title: "Approval Required",
        message: `Task "${task.title}" requires approval`,
        severity: Severity.HIGH,
        isRead: false,
        linkUrl: `/tasks/${id}`,
        createdAt: now,
      });

      store.insert(store.logEvents, {
        id: generateId("log"),
        organizationId: auth.ctx.organizationId,
        workspaceId: task.workspaceId,
        taskId: id,
        level: LogLevel.INFO,
        message: `Approval ${approval.id} auto-created for task`,
        timestamp: now,
      });
    }
  }

  return jsonResponse({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const task = store.findById(store.tasks, id);
  if (!task) return errorResponse("Task not found", 404);

  const runs = store.filter(store.taskRuns, (r) => r.taskId === id);
  for (const run of runs) store.remove(store.taskRuns, run.id);

  const deps = store.filter(store.taskDependencies, (d) => d.taskId === id || d.dependsOnTaskId === id);
  for (const dep of deps) store.remove(store.taskDependencies, dep.id);

  const comments = store.filter(store.comments, (c) => c.taskId === id);
  for (const comment of comments) store.remove(store.comments, comment.id);

  store.remove(store.tasks, id);

  return jsonResponse({ success: true });
}
