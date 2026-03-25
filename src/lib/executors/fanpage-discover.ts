/**
 * Executor: fanpage:discover
 *
 * Scans the configured content source folder for new files,
 * deduplicates against existing PostDrafts, and creates DRAFT rows.
 */

import type { ClaimedTask, ExecutorFn } from "../runner";
import type { PrismaClient } from "../../generated/prisma/client";
import { scanLocalFolder, deduplicateCandidates } from "../services/content-source";

interface FanpageConfig {
  contentSourcePath?: string;
  [key: string]: unknown;
}

export const fanpageDiscoverExecutor: ExecutorFn = async (
  task: ClaimedTask,
  prisma: PrismaClient
) => {
  const workspaceId = task.workspaceId;
  if (!workspaceId) {
    return { output: { error: "No workspaceId on task" } };
  }

  const moduleInstall = await prisma.moduleInstallation.findFirst({
    where: {
      workspaceId,
      moduleType: "social-media-manager",
      status: "ACTIVE",
    },
    select: { config: true, organizationId: true },
  });

  if (!moduleInstall) {
    return { output: { error: "No active social-media-manager module for workspace" } };
  }

  const config = (moduleInstall.config ?? {}) as FanpageConfig;
  const sourcePath = config.contentSourcePath;

  if (!sourcePath || typeof sourcePath !== "string") {
    return { output: { error: "No contentSourcePath configured", config } };
  }

  const candidates = scanLocalFolder(sourcePath, { recursive: false });

  const existingDrafts = await prisma.postDraft.findMany({
    where: { workspaceId },
    select: { title: true },
  });
  const existingTitles = new Set(existingDrafts.map((d) => d.title));

  const newCandidates = deduplicateCandidates(candidates, existingTitles);

  let created = 0;
  for (const c of newCandidates) {
    await prisma.postDraft.create({
      data: {
        title: c.fileName,
        content: `[Auto-discovered] ${c.filePath}`,
        platform: "FACEBOOK_PAGE",
        status: "DRAFT",
        organizationId: moduleInstall.organizationId,
        workspaceId,
        tags: ["auto-discovered", c.type],
      },
      select: { id: true },
    });
    created++;
  }

  await prisma.logEvent.create({
    data: {
      level: "INFO",
      source: "fanpage:discover",
      message: `Discovered ${candidates.length} files, created ${created} new drafts (${candidates.length - newCandidates.length} duplicates skipped)`,
      metadata: { sourcePath, totalFiles: candidates.length, newDrafts: created },
      organizationId: moduleInstall.organizationId,
      workspaceId,
      taskId: task.id,
    },
  });

  return {
    output: {
      discovered: candidates.length,
      created,
      skipped: candidates.length - newCandidates.length,
    },
  };
};
