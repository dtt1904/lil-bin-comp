import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest, errorResponse } from "@/lib/api-auth";

/**
 * GET /api/v1/salon/dashboard
 *
 * Returns workspace-scoped KPIs for a nail salon.
 * The salon owner can only see their own workspace data.
 *
 * Required header: x-workspace-id
 */
export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const workspaceId = req.headers.get("x-workspace-id");
  if (!workspaceId) return errorResponse("x-workspace-id header is required", 400);

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, metadata: true },
    });

    if (!workspace) return errorResponse(`Workspace "${workspaceId}" not found`, 404);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      tasksToday,
      tasksPending,
      tasksFailed,
      departments,
      agents,
      recentLogs,
      drafts,
      publishedPosts,
      invoices,
    ] = await Promise.all([
      prisma.task.count({
        where: { workspaceId, status: "COMPLETED", updatedAt: { gte: todayStart } },
      }).catch(() => 0),

      prisma.task.count({
        where: { workspaceId, status: { in: ["QUEUED", "RUNNING"] } },
      }).catch(() => 0),

      prisma.task.count({
        where: { workspaceId, status: "FAILED", updatedAt: { gte: weekAgo } },
      }).catch(() => 0),

      prisma.department.findMany({
        where: { workspaceId },
        select: { id: true, name: true, slug: true },
      }).catch(() => []),

      prisma.agent.findMany({
        where: { workspaceId },
        select: { id: true, name: true, role: true, status: true },
      }).catch(() => []),

      prisma.logEvent.findMany({
        where: { workspaceId, createdAt: { gte: todayStart } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { level: true, source: true, message: true, createdAt: true },
      }).catch(() => []),

      prisma.postDraft.count({
        where: { workspaceId },
      }).catch(() => 0),

      prisma.publishedPost.count({
        where: { workspaceId },
      }).catch(() => 0),

      prisma.invoiceSnapshot.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          customerName: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      }).catch(() => []),
    ]);

    return NextResponse.json({
      data: {
        workspace: { id: workspace.id, name: workspace.name },
        kpi: {
          tasksCompletedToday: tasksToday,
          tasksPending,
          tasksFailedThisWeek: tasksFailed,
          totalDrafts: drafts,
          totalPublished: publishedPosts,
        },
        departments,
        agents,
        recentInvoices: invoices,
        recentActivity: recentLogs,
      },
    });
  } catch (err) {
    console.error("[salon/dashboard] Error:", err);
    return errorResponse("Failed to fetch salon dashboard", 500);
  }
}
