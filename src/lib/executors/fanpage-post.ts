/**
 * Executor: fanpage:post
 *
 * Finds PostDrafts in APPROVED or SCHEDULED (where scheduledAt <= now),
 * then publishes to Facebook via Graph API based on the workspace's mode config.
 *
 * Modes:
 *   dry_run  — logs what would be posted, marks task complete, no FB call
 *   review   — skips posting, logs a review-needed event
 *   live     — actually posts to Facebook and creates PublishedPost rows
 */

import type { ClaimedTask, ExecutorFn } from "../runner";
import type { PrismaClient } from "../../generated/prisma/client";
import { postToPage } from "../services/facebook-page";

type PostMode = "dry_run" | "review" | "live";

interface FanpageConfig {
  mode?: PostMode;
  [key: string]: unknown;
}

export const fanpagePostExecutor: ExecutorFn = async (
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
    return { output: { error: "No active social-media-manager module" } };
  }

  const config = (moduleInstall.config ?? {}) as FanpageConfig;
  const mode: PostMode = config.mode ?? "dry_run";

  const now = new Date();
  const readyDrafts = await prisma.postDraft.findMany({
    where: {
      workspaceId,
      status: { in: ["APPROVED", "SCHEDULED"] },
      OR: [
        { scheduledAt: null },
        { scheduledAt: { lte: now } },
      ],
    },
    select: { id: true, title: true, content: true, platform: true },
    take: 10,
  });

  if (readyDrafts.length === 0) {
    return { output: { posted: 0, dryRun: 0, failed: 0, message: "No ready drafts" } };
  }

  if (mode === "review") {
    await prisma.logEvent.create({
      data: {
        level: "INFO",
        source: "fanpage:post",
        message: `Review mode: ${readyDrafts.length} drafts ready for posting but held for human review`,
        metadata: { mode, draftIds: readyDrafts.map((d) => d.id) },
        organizationId: task.organizationId,
        workspaceId,
        taskId: task.id,
      },
    });
    return { output: { posted: 0, dryRun: 0, failed: 0, reviewHeld: readyDrafts.length } };
  }

  const isDryRun = mode === "dry_run";

  let fbAccount: { accessToken: string | null; accountId: string | null } | null = null;
  if (!isDryRun) {
    fbAccount = await prisma.integrationAccount.findFirst({
      where: {
        workspaceId,
        platform: "facebook",
        status: "ACTIVE",
      },
      select: { accessToken: true, accountId: true },
    });

    if (!fbAccount?.accessToken || !fbAccount.accountId) {
      await prisma.logEvent.create({
        data: {
          level: "ERROR",
          source: "fanpage:post",
          message: "Live mode but no valid Facebook IntegrationAccount found — aborting",
          organizationId: task.organizationId,
          workspaceId,
          taskId: task.id,
        },
      });
      return { output: { error: "No Facebook IntegrationAccount with valid token" } };
    }
  }

  let posted = 0;
  let dryRun = 0;
  let failed = 0;

  for (const draft of readyDrafts) {
    try {
      const result = await postToPage(
        fbAccount?.accountId ?? "dry-run-page",
        fbAccount?.accessToken ?? "dry-run-token",
        { message: draft.content },
        isDryRun
      );

      if (!result.ok) {
        await prisma.postDraft.update({
          where: { id: draft.id },
          data: { status: "FAILED" },
          select: { id: true },
        });
        failed++;
        continue;
      }

      if (isDryRun) {
        dryRun++;
      } else {
        await prisma.publishedPost.create({
          data: {
            postDraftId: draft.id,
            platform: "facebook",
            externalPostId: result.result.postId,
            url: result.result.url,
            publishedAt: new Date(),
            organizationId: task.organizationId,
            workspaceId,
          },
        });

        await prisma.postDraft.update({
          where: { id: draft.id },
          data: { status: "PUBLISHED" },
          select: { id: true },
        });
        posted++;
      }
    } catch (err) {
      console.error(`[fanpage:post] Failed to post draft ${draft.id}:`, err);
      await prisma.postDraft.update({
        where: { id: draft.id },
        data: { status: "FAILED" },
        select: { id: true },
      });
      failed++;
    }
  }

  await prisma.logEvent.create({
    data: {
      level: failed > 0 ? "WARN" : "INFO",
      source: "fanpage:post",
      message: `Posting complete: ${posted} posted, ${dryRun} dry-run, ${failed} failed`,
      metadata: { mode, posted, dryRun, failed },
      organizationId: task.organizationId,
      workspaceId,
      taskId: task.id,
    },
  });

  return { output: { posted, dryRun, failed } };
};
