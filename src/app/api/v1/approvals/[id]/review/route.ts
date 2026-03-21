import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { ApprovalStatus, TaskStatus, LogLevel, Severity } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const approval = store.findById(store.approvals, id);
  if (!approval) return errorResponse("Approval not found", 404);

  if (approval.status !== ApprovalStatus.PENDING) {
    return errorResponse(`Approval already ${approval.status.toLowerCase()}`);
  }

  const body = await req.json();

  if (!body.action || !body.reviewerId) {
    return errorResponse("action and reviewerId are required");
  }
  if (body.action !== "approve" && body.action !== "deny") {
    return errorResponse('action must be "approve" or "deny"');
  }

  const now = new Date();
  const newStatus = body.action === "approve"
    ? ApprovalStatus.APPROVED
    : ApprovalStatus.DENIED;

  store.update(store.approvals, id, {
    status: newStatus,
    reviewerId: body.reviewerId,
    reviewNote: body.reviewNote ?? undefined,
    reviewedAt: now,
  });

  const task = store.findById(store.tasks, approval.taskId);

  if (task) {
    if (newStatus === ApprovalStatus.APPROVED) {
      store.update(store.tasks, task.id, {
        status: TaskStatus.QUEUED,
        updatedAt: now,
      });
    } else {
      store.update(store.tasks, task.id, {
        status: TaskStatus.BLOCKED,
        updatedAt: now,
      });
    }
  }

  store.insert(store.logEvents, {
    id: generateId("log"),
    organizationId: auth.ctx.organizationId,
    workspaceId: task?.workspaceId,
    taskId: approval.taskId,
    level: LogLevel.INFO,
    message: `Approval ${id} ${body.action === "approve" ? "approved" : "denied"} by ${body.reviewerId}`,
    timestamp: now,
  });

  let notifyUserId: string | undefined;
  if (approval.requestedById) {
    const agent = store.findById(store.agents, approval.requestedById);
    if (agent) {
      notifyUserId = agent.createdById;
    } else {
      notifyUserId = approval.requestedById;
    }
  }

  if (notifyUserId) {
    store.insert(store.notifications, {
      id: generateId("notif"),
      userId: notifyUserId,
      title: `Approval ${newStatus === ApprovalStatus.APPROVED ? "Approved" : "Denied"}`,
      message: `Approval for task "${task?.title ?? approval.taskId}" was ${newStatus.toLowerCase()} by ${body.reviewerId}`,
      severity: newStatus === ApprovalStatus.DENIED ? Severity.HIGH : Severity.MEDIUM,
      isRead: false,
      linkUrl: `/tasks/${approval.taskId}`,
      createdAt: now,
    });
  }

  const updatedApproval = store.findById(store.approvals, id);
  return jsonResponse({ data: updatedApproval });
}
