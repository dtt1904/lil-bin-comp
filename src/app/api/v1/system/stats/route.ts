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
      prisma.organization.count(),
      prisma.workspace.count(),
      prisma.department.count(),
      prisma.user.count(),
      prisma.agent.count(),
      prisma.project.count(),
      prisma.task.count(),
      prisma.listing.count(),
      prisma.mediaAsset.count(),
      prisma.postDraft.count(),
      prisma.publishedPost.count(),
      prisma.shareTask.count(),
      prisma.invoiceSnapshot.count(),
      prisma.logEvent.count(),
      prisma.agent.count({
        where: { status: { in: [AgentStatus.ONLINE, AgentStatus.BUSY] } },
      }),
      prisma.task.count({
        where: { status: TaskStatus.RUNNING },
      }),
      prisma.approval.count({
        where: { status: ApprovalStatus.PENDING },
      }),
      prisma.postDraft.count({
        where: { status: PostDraftStatus.REVIEW },
      }),
      prisma.invoiceSnapshot.count({
        where: { status: InvoiceStatus.OVERDUE },
      }),
      prisma.invoiceSnapshot.count({
        where: {
          status: InvoiceStatus.SENT,
          dueDate: { lt: new Date() },
        },
      }),
      prisma.listing.count({
        where: { status: { not: ListingStatus.ARCHIVED } },
      }),
      prisma.logEvent.count({
        where: {
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
