import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { effectiveWorkspaceId } from "@/lib/workspace-request";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const workspaceId = effectiveWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId required" },
      { status: 400 }
    );
  }

  try {
    const [
      moduleInstall,
      draftCounts,
      recentPublished,
      recentLogs,
      activeTasks,
    ] = await Promise.all([
      prisma.moduleInstallation
        .findFirst({
          where: {
            workspaceId,
            moduleType: "social-media-manager",
            status: "ACTIVE",
          },
          select: { config: true, status: true, updatedAt: true },
        })
        .catch(() => null),

      prisma.postDraft
        .groupBy({
          by: ["status"],
          where: { workspaceId },
          _count: { id: true },
        })
        .catch(() => []),

      prisma.publishedPost
        .findMany({
          where: { workspaceId },
          orderBy: { publishedAt: "desc" },
          take: 5,
          select: {
            id: true,
            platform: true,
            externalPostId: true,
            url: true,
            publishedAt: true,
            metrics: true,
          },
        })
        .catch(() => []),

      prisma.logEvent
        .findMany({
          where: {
            workspaceId,
            source: { startsWith: "fanpage:" },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            level: true,
            source: true,
            message: true,
            createdAt: true,
          },
        })
        .catch(() => []),

      prisma.task
        .findMany({
          where: {
            workspaceId,
            labels: { hasSome: [
              "fanpage:discover",
              "fanpage:draft",
              "fanpage:post",
              "fanpage:engage",
            ] },
            status: { in: ["QUEUED", "RUNNING"] },
          },
          select: {
            id: true,
            title: true,
            status: true,
            labels: true,
            createdAt: true,
          },
        })
        .catch(() => []),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of draftCounts) {
      statusMap[row.status] = row._count.id;
    }

    return NextResponse.json({
      data: {
        moduleInstalled: !!moduleInstall,
        config: moduleInstall?.config ?? null,
        lastConfigUpdate: moduleInstall?.updatedAt ?? null,
        pipeline: {
          draft: statusMap["DRAFT"] ?? 0,
          review: statusMap["REVIEW"] ?? 0,
          approved: statusMap["APPROVED"] ?? 0,
          scheduled: statusMap["SCHEDULED"] ?? 0,
          published: statusMap["PUBLISHED"] ?? 0,
          failed: statusMap["FAILED"] ?? 0,
        },
        recentPublished,
        recentLogs,
        activeTasks,
      },
    });
  } catch (err) {
    console.error("[fanpage/status] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch fanpage status" },
      { status: 500 }
    );
  }
}
