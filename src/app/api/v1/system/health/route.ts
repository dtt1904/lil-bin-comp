import { prisma } from "@/lib/db";
import { jsonResponse, errorResponse } from "@/lib/api-auth";

const startTime = Date.now();

export async function GET() {
  try {
    const [
      workspaces,
      departments,
      agents,
      tasks,
      projects,
      listings,
      mediaAssets,
      postDrafts,
      publishedPosts,
      shareTasks,
      invoices,
      users,
    ] = await Promise.all([
      prisma.workspace.count(),
      prisma.department.count(),
      prisma.agent.count(),
      prisma.task.count(),
      prisma.project.count(),
      prisma.listing.count(),
      prisma.mediaAsset.count(),
      prisma.postDraft.count(),
      prisma.publishedPost.count(),
      prisma.shareTask.count(),
      prisma.invoiceSnapshot.count(),
      prisma.user.count(),
    ]);

    return jsonResponse({
      status: "ok",
      version: "1.0.0",
      uptime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      counts: {
        workspaces,
        departments,
        agents,
        tasks,
        projects,
        listings,
        mediaAssets,
        postDrafts,
        publishedPosts,
        shareTasks,
        invoices,
        users,
      },
    });
  } catch (err) {
    return errorResponse("Health check failed", 500, {
      status: "error",
      message: (err as Error).message,
    });
  }
}
