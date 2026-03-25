export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { getDashboardWorkspaceScope } from "@/lib/dashboard-workspace";
import { FanpageClient } from "./_client";

export default async function FanpagePage() {
  const { workspaceId, organizationId } = await getDashboardWorkspaceScope();

  if (!workspaceId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Fanpage Automation</h1>
        <p className="text-zinc-400">
          No workspace selected. Please select a workspace first.
        </p>
      </div>
    );
  }

  const [moduleInstall, draftCounts, recentPublished, recentLogs, activeTasks, workspace] =
    await Promise.all([
      prisma.moduleInstallation
        .findFirst({
          where: {
            workspaceId,
            moduleType: "social-media-manager",
            status: "ACTIVE",
          },
          select: { id: true, config: true, status: true, updatedAt: true },
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
          take: 10,
          select: {
            id: true,
            platform: true,
            externalPostId: true,
            url: true,
            publishedAt: true,
            metrics: true,
            postDraft: { select: { title: true } },
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
          take: 20,
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
            labels: {
              hasSome: [
                "fanpage:discover",
                "fanpage:draft",
                "fanpage:post",
                "fanpage:engage",
              ],
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            status: true,
            labels: true,
            createdAt: true,
            updatedAt: true,
          },
        })
        .catch(() => []),

      prisma.workspace
        .findUnique({
          where: { id: workspaceId },
          select: { id: true, name: true },
        })
        .catch(() => null),
    ]);

  const statusMap: Record<string, number> = {};
  for (const row of draftCounts) {
    statusMap[row.status] = row._count.id;
  }

  const pipeline = {
    draft: statusMap["DRAFT"] ?? 0,
    review: statusMap["REVIEW"] ?? 0,
    approved: statusMap["APPROVED"] ?? 0,
    scheduled: statusMap["SCHEDULED"] ?? 0,
    published: statusMap["PUBLISHED"] ?? 0,
    failed: statusMap["FAILED"] ?? 0,
  };

  const config = (moduleInstall?.config ?? null) as Record<string, unknown> | null;

  return (
    <FanpageClient
      workspaceId={workspaceId}
      workspaceName={workspace?.name ?? "Unknown"}
      moduleInstalled={!!moduleInstall}
      config={config}
      pipeline={pipeline}
      recentPublished={JSON.parse(JSON.stringify(recentPublished))}
      recentLogs={JSON.parse(JSON.stringify(recentLogs))}
      activeTasks={JSON.parse(JSON.stringify(activeTasks))}
    />
  );
}
