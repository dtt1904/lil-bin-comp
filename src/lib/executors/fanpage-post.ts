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

type JsonPrimitive = string | number | boolean | null;

async function logPost(
  prisma: PrismaClient,
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  ctx: { organizationId: string; workspaceId: string; taskId: string },
  extra?: Record<string, JsonPrimitive | string[]>
) {
  try {
    await prisma.logEvent.create({
      data: {
        level,
        source: "fanpage:post",
        message,
        metadata: (extra ?? null) as Record<string, JsonPrimitive>,
        organizationId: ctx.organizationId,
        workspaceId: ctx.workspaceId,
        taskId: ctx.taskId,
      },
    });
  } catch (err) {
    console.error("[fanpage:post] Failed to write log event:", err);
  }
}

export const fanpagePostExecutor: ExecutorFn = async (
  task: ClaimedTask,
  prisma: PrismaClient
) => {
  const workspaceId = task.workspaceId;
  console.log(`[fanpage:post] ===== Starting for task ${task.id}, workspaceId=${workspaceId} =====`);

  if (!workspaceId) {
    console.error("[fanpage:post] ABORT: No workspaceId on task");
    return { output: { error: "No workspaceId on task" } };
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
    console.error(`[fanpage:post] ABORT: ${msg}`);
    await logPost(prisma, "ERROR", msg, ctx);
    return { output: { error: msg } };
  }

  const config = (moduleInstall.config ?? {}) as FanpageConfig;
  const mode: PostMode = config.mode ?? "dry_run";
  console.log(`[fanpage:post] Mode resolved: "${mode}" (config.mode=${JSON.stringify(config.mode)})`);
  console.log(`[fanpage:post] Full config:`, JSON.stringify(config));

  const now = new Date();
  console.log(`[fanpage:post] Current time: ${now.toISOString()}`);

  const readyDrafts = await prisma.postDraft.findMany({
    where: {
      workspaceId,
      status: { in: ["APPROVED", "SCHEDULED"] },
      OR: [
        { scheduledAt: null },
        { scheduledAt: { lte: now } },
      ],
    },
    select: {
      id: true,
      title: true,
      content: true,
      platform: true,
      status: true,
      scheduledAt: true,
    },
    take: 10,
  });

  console.log(`[fanpage:post] Ready drafts found: ${readyDrafts.length}`);
  for (const d of readyDrafts) {
    console.log(`[fanpage:post]   - ${d.id} "${d.title}" status=${d.status} scheduledAt=${d.scheduledAt?.toISOString() ?? "null"}`);
  }

  if (readyDrafts.length === 0) {
    const allDrafts = await prisma.postDraft.findMany({
      where: { workspaceId },
      select: { id: true, title: true, status: true, scheduledAt: true },
      take: 20,
    });
    const debugInfo = allDrafts.map((d) =>
      `${d.status}: "${d.title}" scheduledAt=${d.scheduledAt?.toISOString() ?? "null"}`
    );
    console.log(`[fanpage:post] No ready drafts. All drafts in workspace (${allDrafts.length}):`);
    debugInfo.forEach((line) => console.log(`[fanpage:post]   ${line}`));

    await logPost(prisma, "WARN", `No ready drafts found (${allDrafts.length} total in workspace)`, ctx, {
      totalDraftsInWorkspace: allDrafts.length,
      draftStatuses: allDrafts.map((d) => d.status),
    });

    return {
      output: {
        posted: 0,
        dryRun: 0,
        failed: 0,
        message: "No ready drafts",
        allDraftStatuses: allDrafts.map((d) => `${d.status}:${d.scheduledAt?.toISOString() ?? "null"}`),
      },
    };
  }

  if (mode === "review") {
    console.log(`[fanpage:post] Review mode — holding ${readyDrafts.length} drafts for human review`);
    await logPost(prisma, "INFO",
      `Review mode: ${readyDrafts.length} drafts ready but held for human review`,
      ctx,
      { mode, draftCount: readyDrafts.length },
    );
    return { output: { posted: 0, dryRun: 0, failed: 0, reviewHeld: readyDrafts.length, mode } };
  }

  const isDryRun = mode === "dry_run";
  console.log(`[fanpage:post] Processing mode: ${isDryRun ? "DRY RUN" : "LIVE"}`);

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

    console.log(`[fanpage:post] FB account lookup: found=${!!fbAccount}, accountId=${fbAccount?.accountId ?? "null"}, hasToken=${!!fbAccount?.accessToken}, tokenLength=${fbAccount?.accessToken?.length ?? 0}`);

    if (!fbAccount?.accessToken || !fbAccount.accountId) {
      const msg = `Live mode but no valid Facebook IntegrationAccount — accountId=${fbAccount?.accountId ?? "null"}, hasToken=${!!fbAccount?.accessToken}`;
      console.error(`[fanpage:post] ABORT: ${msg}`);
      await logPost(prisma, "ERROR", msg, ctx, {
        mode,
        hasAccount: !!fbAccount,
        hasAccountId: !!fbAccount?.accountId,
        hasToken: !!fbAccount?.accessToken,
      });
      return { output: { error: msg } };
    }
  }

  let posted = 0;
  let dryRun = 0;
  let failed = 0;
  const results: Array<{ draftId: string; title: string; outcome: string; detail?: string }> = [];

  for (const draft of readyDrafts) {
    console.log(`[fanpage:post] --- Processing draft: ${draft.id} "${draft.title}" ---`);
    console.log(`[fanpage:post]   status=${draft.status}, scheduledAt=${draft.scheduledAt?.toISOString() ?? "null"}`);
    console.log(`[fanpage:post]   content length=${draft.content.length}, isDryRun=${isDryRun}`);

    try {
      const pageId = fbAccount?.accountId ?? "dry-run-page";
      const token = fbAccount?.accessToken ?? "dry-run-token";
      console.log(`[fanpage:post]   Calling postToPage(pageId=${pageId}, dryRun=${isDryRun})`);

      const result = await postToPage(pageId, token, { message: draft.content }, isDryRun);

      if (!result.ok) {
        console.error(`[fanpage:post]   Graph API FAILED: ${result.error}`);
        await logPost(prisma, "ERROR",
          `Failed to post "${draft.title}": ${result.error}`,
          ctx,
          { draftId: draft.id, error: result.error, mode },
        );
        await prisma.postDraft.update({
          where: { id: draft.id },
          data: { status: "FAILED" },
          select: { id: true },
        });
        failed++;
        results.push({ draftId: draft.id, title: draft.title, outcome: "FAILED", detail: result.error });
        continue;
      }

      if (isDryRun) {
        console.log(`[fanpage:post]   DRY RUN success — mock postId=${result.result.postId}`);
        dryRun++;
        results.push({ draftId: draft.id, title: draft.title, outcome: "DRY_RUN", detail: result.result.postId });
      } else {
        console.log(`[fanpage:post]   LIVE POST success — postId=${result.result.postId}, url=${result.result.url}`);

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
        console.log(`[fanpage:post]   PublishedPost row created`);

        await prisma.postDraft.update({
          where: { id: draft.id },
          data: { status: "PUBLISHED" },
          select: { id: true },
        });
        console.log(`[fanpage:post]   Draft status updated to PUBLISHED`);

        posted++;
        results.push({
          draftId: draft.id,
          title: draft.title,
          outcome: "PUBLISHED",
          detail: `${result.result.postId} -> ${result.result.url}`,
        });

        await logPost(prisma, "INFO",
          `Published "${draft.title}" to Facebook: ${result.result.url}`,
          ctx,
          { draftId: draft.id, externalPostId: result.result.postId, url: result.result.url },
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[fanpage:post]   EXCEPTION for draft ${draft.id}:`, errMsg);
      await logPost(prisma, "ERROR",
        `Exception posting "${draft.title}": ${errMsg}`,
        ctx,
        { draftId: draft.id, error: errMsg, mode },
      );
      await prisma.postDraft.update({
        where: { id: draft.id },
        data: { status: "FAILED" },
        select: { id: true },
      });
      failed++;
      results.push({ draftId: draft.id, title: draft.title, outcome: "EXCEPTION", detail: errMsg });
    }
  }

  const summary = `Mode=${mode}: ${posted} posted, ${dryRun} dry-run, ${failed} failed (of ${readyDrafts.length} ready)`;
  console.log(`[fanpage:post] ===== ${summary} =====`);

  await logPost(prisma, failed > 0 ? "WARN" : "INFO", summary, ctx, {
    mode,
    posted,
    dryRun,
    failed,
    totalReady: readyDrafts.length,
  });

  return {
    output: {
      mode,
      posted,
      dryRun,
      failed,
      results,
    },
  };
};
