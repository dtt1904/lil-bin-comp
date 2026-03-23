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
    // Frontend may send either:
    // - { action: "approve" | "deny", reviewerId: string, reviewNote?: string }
    // - { decision: "APPROVED" | "DENIED" } (no reviewerId)
    const decision = body.decision as unknown;
    const action =
      typeof body.action === "string"
        ? (body.action as string)
        : typeof decision === "string"
          ? decision === "APPROVED"
            ? "approve"
            : "deny"
          : undefined;

    if (action !== "approve" && action !== "deny") {
      return errorResponse(
        'action (approve|deny) or decision (APPROVED|DENIED) is required'
      );
    }

    const newStatus =
      action === "approve"
        ? ApprovalStatus.APPROVED
        : ApprovalStatus.DENIED;

    // The system API is key-based (no user session), so reviewerId may be omitted.
    // In that case, choose a deterministic fallback reviewer user from the organization.
    let reviewerId: string | undefined =
      typeof body.reviewerId === "string" ? body.reviewerId : undefined;
    if (!reviewerId) {
      const fallbackUser = await prisma.user.findFirst({
        where: { organizationId: auth.ctx.organizationId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!fallbackUser) return errorResponse("No reviewer available", 400);
      reviewerId = fallbackUser.id;
    }

    const updatedApproval = await prisma.approval.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedById: reviewerId,
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
        message: `Approval ${id} ${action === "approve" ? "approved" : "denied"} by ${reviewerId}`,
      },
    });

    await prisma.notification.create({
      data: {
        type: "approval_reviewed",
        organizationId: auth.ctx.organizationId,
        workspaceId: task?.workspaceId,
        title: `Approval ${
          newStatus === ApprovalStatus.APPROVED ? "Approved" : "Denied"
        }`,
        message: `Approval for task "${
          task?.title ?? approval.taskId
        }" was ${newStatus.toLowerCase()} by ${reviewerId}`,
        severity: newStatus === ApprovalStatus.DENIED ? Severity.HIGH : Severity.MEDIUM,
        link: `/tasks/${approval.taskId}`,
      },
    });

    return jsonResponse({ data: updatedApproval });
  } catch (err) {
    return errorResponse(`Failed to review approval: ${err instanceof Error ? err.message : err}`, 500);
  }
}
