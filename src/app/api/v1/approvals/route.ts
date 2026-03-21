import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { ApprovalStatus, LogLevel, Severity } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const offset = parseInt(params.offset || "0", 10) || 0;

  let results = store.approvals;

  if (params.status) {
    results = store.filter(results, (a) => a.status === params.status);
  }
  if (params.taskId) {
    results = store.filter(results, (a) => a.taskId === params.taskId);
  }
  if (params.workspaceId) {
    results = store.filter(results, (a) => {
      const task = store.findById(store.tasks, a.taskId);
      return task?.workspaceId === params.workspaceId;
    });
  }

  const total = results.length;
  const data = results.slice(offset, offset + limit);

  return jsonResponse({ data, meta: { total, limit, offset } });
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.taskId || !body.requestedById) {
    return errorResponse("taskId and requestedById are required");
  }

  const task = store.findById(store.tasks, body.taskId);
  if (!task) return errorResponse("Task not found", 404);

  const now = new Date();
  const approval = store.insert(store.approvals, {
    id: generateId("appr"),
    taskId: body.taskId,
    requestedById: body.requestedById,
    status: ApprovalStatus.PENDING,
    reason: body.reason ?? undefined,
    createdAt: now,
  });

  const notifyUserId = task.assignedToUserId || auth.ctx.organizationId;
  store.insert(store.notifications, {
    id: generateId("notif"),
    userId: notifyUserId,
    title: "New Approval Request",
    message: `Approval requested for task "${task.title}"${body.reason ? `: ${body.reason}` : ""}`,
    severity: body.severity ?? Severity.MEDIUM,
    isRead: false,
    linkUrl: `/approvals/${approval.id}`,
    createdAt: now,
  });

  store.insert(store.logEvents, {
    id: generateId("log"),
    organizationId: auth.ctx.organizationId,
    workspaceId: task.workspaceId,
    taskId: body.taskId,
    level: LogLevel.INFO,
    message: `Approval ${approval.id} requested by ${body.requestedById}`,
    timestamp: now,
  });

  return jsonResponse({ data: approval }, 201);
}
