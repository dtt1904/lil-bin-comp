/**
 * Executor: fanpage:draft
 *
 * Finds PostDrafts in DRAFT status (auto-discovered, no caption yet),
 * generates a caption + CTA for each, and moves them to REVIEW status.
 */

import type { ClaimedTask, ExecutorFn } from "../runner";
import type { PrismaClient } from "../../generated/prisma/client";
import { generateCaption } from "../services/caption-generator";

export const fanpageDraftExecutor: ExecutorFn = async (
  task: ClaimedTask,
  prisma: PrismaClient
) => {
  const workspaceId = task.workspaceId;
  console.log(`[fanpage:draft] Starting for task ${task.id}, workspaceId=${workspaceId}`);

  if (!workspaceId) {
    console.error("[fanpage:draft] ABORT: No workspaceId on task");
    return { output: { error: "No workspaceId on task" } };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  console.log(`[fanpage:draft] Workspace: ${workspace?.name ?? "(not found)"}`);

  const drafts = await prisma.postDraft.findMany({
    where: {
      workspaceId,
      status: "DRAFT",
      tags: { has: "auto-discovered" },
    },
    select: { id: true, title: true, tags: true },
    take: 20,
  });

  console.log(`[fanpage:draft] Found ${drafts.length} undrafted PostDrafts with status=DRAFT + tag=auto-discovered`);

  if (drafts.length === 0) {
    await prisma.logEvent.create({
      data: {
        level: "INFO",
        source: "fanpage:draft",
        message: "No DRAFT PostDrafts with auto-discovered tag found — nothing to caption",
        organizationId: task.organizationId,
        workspaceId,
        taskId: task.id,
      },
    });
    return { output: { drafted: 0, message: "No drafts to process" } };
  }

  let drafted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const draft of drafts) {
    try {
      const fileType = draft.tags.find((t) =>
        ["image", "video", "document"].includes(t)
      ) ?? "other";

      const caption = generateCaption({
        fileName: draft.title,
        fileType,
        workspaceName: workspace?.name ?? "Fanpage",
        platform: "facebook",
        tags: draft.tags.filter((t) => t !== "auto-discovered" && t !== fileType),
      });

      await prisma.postDraft.update({
        where: { id: draft.id },
        data: {
          title: caption.title,
          content: caption.content,
          status: "REVIEW",
          tags: [...new Set([...draft.tags, ...caption.tags, "caption-generated"])],
        },
        select: { id: true },
      });
      drafted++;
      console.log(`[fanpage:draft] Captioned: ${draft.title} -> ${caption.title}`);
    } catch (err) {
      failed++;
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${draft.title}: ${errMsg}`);
      console.error(`[fanpage:draft] Failed to caption ${draft.title}:`, errMsg);
    }
  }

  const summary = `Generated captions for ${drafted} drafts, moved to REVIEW (${failed} failed)`;
  console.log(`[fanpage:draft] ${summary}`);

  await prisma.logEvent.create({
    data: {
      level: failed > 0 ? "WARN" : "INFO",
      source: "fanpage:draft",
      message: summary,
      metadata: { drafted, failed, errors: errors.length > 0 ? errors : undefined },
      organizationId: task.organizationId,
      workspaceId,
      taskId: task.id,
    },
  });

  return { output: { drafted, failed, errors: errors.length > 0 ? errors : undefined } };
};
