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

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

async function logDiscover(
  prisma: PrismaClient,
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  ctx: { organizationId: string; workspaceId: string; taskId: string },
  extra?: Record<string, JsonValue>
) {
  try {
    await prisma.logEvent.create({
      data: {
        level,
        source: "fanpage:discover",
        message,
        metadata: (extra ?? null) as Record<string, JsonPrimitive>,
        organizationId: ctx.organizationId,
        workspaceId: ctx.workspaceId,
        taskId: ctx.taskId,
      },
    });
  } catch (err) {
    console.error("[fanpage:discover] Failed to write log event:", err);
  }
}

export const fanpageDiscoverExecutor: ExecutorFn = async (
  task: ClaimedTask,
  prisma: PrismaClient
) => {
  const workspaceId = task.workspaceId;
  console.log(`[fanpage:discover] Starting for task ${task.id}, workspaceId=${workspaceId}`);

  if (!workspaceId) {
    console.error("[fanpage:discover] ABORT: No workspaceId on task");
    return { output: { error: "No workspaceId on task", taskId: task.id } };
  }

  const ctx = { organizationId: task.organizationId, workspaceId, taskId: task.id };

  const moduleInstall = await prisma.moduleInstallation.findFirst({
    where: {
      workspaceId,
      moduleType: "social-media-manager",
      status: "ACTIVE",
    },
    select: { config: true, organizationId: true },
  });

  if (!moduleInstall) {
    const msg = `No active social-media-manager module for workspace ${workspaceId}`;
    console.error(`[fanpage:discover] ABORT: ${msg}`);
    await logDiscover(prisma, "ERROR", msg, ctx);
    return { output: { error: msg } };
  }

  const config = (moduleInstall.config ?? {}) as FanpageConfig;
  const sourcePath = config.contentSourcePath;
  console.log(`[fanpage:discover] Config:`, JSON.stringify(config, null, 2));

  if (!sourcePath || typeof sourcePath !== "string") {
    const msg = `No contentSourcePath configured in social-media-manager module config`;
    console.error(`[fanpage:discover] ABORT: ${msg}`);
    console.error(`[fanpage:discover] Current config keys: ${Object.keys(config).join(", ")}`);
    await logDiscover(prisma, "ERROR", msg, ctx, {
      configKeys: Object.keys(config),
      contentSourcePathValue: String(sourcePath ?? "undefined"),
      contentSourcePathType: typeof sourcePath,
    });
    return { output: { error: msg, configKeys: Object.keys(config) } };
  }

  console.log(`[fanpage:discover] Scanning folder: ${sourcePath}`);
  const { candidates, diagnostics } = scanLocalFolder(sourcePath, { recursive: true });
  console.log(`[fanpage:discover] Scan result: ${candidates.length} candidates found`);
  console.log(`[fanpage:discover] Diagnostics:`, JSON.stringify(diagnostics));

  if (candidates.length === 0) {
    const msg = `Scan found 0 files in ${sourcePath}`;
    console.warn(`[fanpage:discover] ${msg}`);
    await logDiscover(prisma, "WARN", msg, ctx, {
      sourcePath,
      resolvedPath: diagnostics.resolvedPath,
      exists: diagnostics.exists,
      isDirectory: diagnostics.isDirectory,
      totalEntries: diagnostics.totalEntries,
      skippedHidden: diagnostics.skippedHidden,
      error: diagnostics.error ?? null,
    });
    return { output: { discovered: 0, created: 0, skipped: 0, sourcePath, diagnostics } };
  }

  const existingDrafts = await prisma.postDraft.findMany({
    where: { workspaceId },
    select: { title: true },
  });
  const existingTitles = new Set(existingDrafts.map((d) => d.title));
  console.log(`[fanpage:discover] Existing drafts in workspace: ${existingDrafts.length}`);

  const newCandidates = deduplicateCandidates(candidates, existingTitles);
  console.log(`[fanpage:discover] After dedup: ${newCandidates.length} new, ${candidates.length - newCandidates.length} skipped`);

  if (newCandidates.length === 0) {
    const msg = `All ${candidates.length} files already have matching PostDrafts — nothing new to create`;
    console.log(`[fanpage:discover] ${msg}`);
    await logDiscover(prisma, "INFO", msg, ctx, {
      sourcePath,
      totalFiles: candidates.length,
      existingDrafts: existingDrafts.length,
    });
    return { output: { discovered: candidates.length, created: 0, skipped: candidates.length } };
  }

  let created = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const c of newCandidates) {
    try {
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
      console.log(`[fanpage:discover] Created draft for: ${c.fileName}`);
    } catch (err) {
      failed++;
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${c.fileName}: ${errMsg}`);
      console.error(`[fanpage:discover] Failed to create draft for ${c.fileName}:`, errMsg);
    }
  }

  const summary = `Discovered ${candidates.length} files, created ${created} drafts, skipped ${candidates.length - newCandidates.length} duplicates, ${failed} failed`;
  console.log(`[fanpage:discover] ${summary}`);

  await logDiscover(prisma, failed > 0 ? "WARN" : "INFO", summary, ctx, {
    sourcePath,
    totalFiles: candidates.length,
    newCandidates: newCandidates.length,
    created,
    failed,
    duplicatesSkipped: candidates.length - newCandidates.length,
    fileNames: newCandidates.map((c) => c.fileName),
  });

  return {
    output: {
      discovered: candidates.length,
      created,
      skipped: candidates.length - newCandidates.length,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    },
  };
};
