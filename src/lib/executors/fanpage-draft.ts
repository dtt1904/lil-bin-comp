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
  if (!workspaceId) {
    return { output: { error: "No workspaceId on task" } };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });

  const drafts = await prisma.postDraft.findMany({
    where: {
      workspaceId,
      status: "DRAFT",
      tags: { has: "auto-discovered" },
    },
    select: { id: true, title: true, tags: true },
    take: 20,
  });

  let drafted = 0;
  for (const draft of drafts) {
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
  }

  await prisma.logEvent.create({
    data: {
      level: "INFO",
      source: "fanpage:draft",
      message: `Generated captions for ${drafted} drafts, moved to REVIEW`,
      metadata: { drafted },
      organizationId: task.organizationId,
      workspaceId,
      taskId: task.id,
    },
  });

  return { output: { drafted } };
};
