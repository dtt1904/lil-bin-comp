import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { ApprovalStatus, TaskStatus, LogLevel, Severity } from "@/generated/prisma/enums";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const approval = await prisma.approval.findUnique({ where: { id } });
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

    const newStatus =
      body.action === "approve"
        ? ApprovalStatus.APPROVED
        : ApprovalStatus.DENIED;

    const updatedApproval = await prisma.approval.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedById: body.reviewerId,
        description: body.reviewNote
          ? `${approval.description ?? ""}\n\nReview: ${body.reviewNote}`.trim()
          : undefined,
        reviewedAt: new Date(),
      },
    });

    const task = approval.taskId
      ? await prisma.task.findUnique({ where: { id: approval.taskId } })
      : null;

    if (task) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status:
            newStatus === ApprovalStatus.APPROVED
              ? TaskStatus.QUEUED
              : TaskStatus.BLOCKED,
        },
      });
    }

    await prisma.logEvent.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: task?.workspaceId,
        taskId: approval.taskId,
        level: LogLevel.INFO,
        source: "api",
        message: `Approval ${id} ${body.action === "approve" ? "approved" : "denied"} by ${body.reviewerId}`,
      },
    });

    await prisma.notification.create({
      data: {
        type: "approval_reviewed",
        organizationId: auth.ctx.organizationId,
        workspaceId: task?.workspaceId,
        title: `Approval ${newStatus === ApprovalStatus.APPROVED ? "Approved" : "Denied"}`,
        message: `Approval for task "${task?.title ?? approval.taskId}" was ${newStatus.toLowerCase()} by ${body.reviewerId}`,
        severity: newStatus === ApprovalStatus.DENIED ? Severity.HIGH : Severity.MEDIUM,
        link: `/tasks/${approval.taskId}`,
      },
    });

    return jsonResponse({ data: updatedApproval });
  } catch (err) {
    return errorResponse(`Failed to review approval: ${err instanceof Error ? err.message : err}`, 500);
  }
}
