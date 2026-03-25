import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest, jsonResponse, errorResponse } from "@/lib/api-auth";
import {
  AgentStatus,
  ApprovalStatus,
  TaskStatus,
  LogLevel,
  PostDraftStatus,
  InvoiceStatus,
  ListingStatus,
} from "@/generated/prisma/enums";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const organizationId = auth.ctx.organizationId;

    const [
      organizationCount,
      workspaceCount,
      departmentCount,
      userCount,
      agentCount,
      projectCount,
      taskCount,
      listingCount,
      mediaAssetCount,
      postDraftCount,
      publishedPostCount,
      shareTaskCount,
      invoiceCount,
      logEventCount,
      activeAgents,
      runningTasks,
      pendingApprovals,
      draftsPendingReview,
      overdueByStatus,
      overdueBySentDate,
      activeListings,
      recentErrors,
    ] = await Promise.all([
      prisma.organization.count({ where: { id: organizationId } }),
      prisma.workspace.count({ where: { organizationId } }),
      prisma.department.count({ where: { organizationId } }),
      prisma.user.count({ where: { organizationId } }),
      prisma.agent.count({ where: { organizationId } }),
      prisma.project.count({ where: { organizationId } }),
      prisma.task.count({ where: { organizationId } }),
      prisma.listing.count({ where: { organizationId } }),
      prisma.mediaAsset.count({ where: { organizationId } }),
      prisma.postDraft.count({ where: { organizationId } }),
      prisma.publishedPost.count({ where: { organizationId } }),
      prisma.shareTask.count({ where: { organizationId } }),
      prisma.invoiceSnapshot.count({ where: { organizationId } }),
      prisma.logEvent.count({ where: { organizationId } }),
      prisma.agent.count({
        where: {
          organizationId,
          status: { in: [AgentStatus.ONLINE, AgentStatus.BUSY] },
        },
      }),
      prisma.task.count({
        where: { organizationId, status: TaskStatus.RUNNING },
      }),
      prisma.approval.count({
        where: {
          status: ApprovalStatus.PENDING,
          requestedBy: { organizationId },
        },
      }),
      prisma.postDraft.count({
        where: { organizationId, status: PostDraftStatus.REVIEW },
      }),
      prisma.invoiceSnapshot.count({
        where: { organizationId, status: InvoiceStatus.OVERDUE },
      }),
      prisma.invoiceSnapshot.count({
        where: {
          organizationId,
          status: InvoiceStatus.SENT,
          dueDate: { lt: new Date() },
        },
      }),
      prisma.listing.count({
        where: {
          organizationId,
          status: { not: ListingStatus.ARCHIVED },
        },
      }),
      prisma.logEvent.count({
        where: {
          organizationId,
          level: LogLevel.ERROR,
          createdAt: { gte: oneDayAgo },
        },
      }),
    ]);

    return jsonResponse({
      data: {
        entities: {
          organizations: organizationCount,
          workspaces: workspaceCount,
          departments: departmentCount,
          users: userCount,
          agents: agentCount,
          projects: projectCount,
          tasks: taskCount,
          listings: listingCount,
          mediaAssets: mediaAssetCount,
          postDrafts: postDraftCount,
          publishedPosts: publishedPostCount,
          shareTasks: shareTaskCount,
          invoices: invoiceCount,
          logEvents: logEventCount,
        },
        activity: {
          activeAgents,
          runningTasks,
          pendingApprovals,
          draftsPendingReview,
          overdueInvoices: overdueByStatus + overdueBySentDate,
          activeListings,
          recentErrors,
        },
      },
    });
  } catch (err) {
    return errorResponse("Failed to fetch stats", 500, {
      message: (err as Error).message,
    });
  }
}
