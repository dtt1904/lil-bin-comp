/**
 * Executor: fanpage:engage
 *
 * Monitors recent PublishedPosts for engagement (comments, metrics),
 * updates metrics JSON, and creates follow-up Task rows for high-engagement signals.
 */

import type { ClaimedTask, ExecutorFn } from "../runner";
import type { PrismaClient } from "../../generated/prisma/client";
import { getPageComments, getPostMetrics } from "../services/facebook-page";

const LEAD_COMMENT_THRESHOLD = 3;

export const fanpageEngageExecutor: ExecutorFn = async (
  task: ClaimedTask,
  prisma: PrismaClient
) => {
  const workspaceId = task.workspaceId;
  if (!workspaceId) {
    return { output: { error: "No workspaceId on task" } };
  }

  const fbAccount = await prisma.integrationAccount.findFirst({
    where: {
      workspaceId,
      platform: "facebook",
      status: "ACTIVE",
    },
    select: { accessToken: true },
  });

  const token = fbAccount?.accessToken;

  const recentPosts = await prisma.publishedPost.findMany({
    where: {
      workspaceId,
      publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true, externalPostId: true, metrics: true },
    orderBy: { publishedAt: "desc" },
    take: 20,
  });

  if (recentPosts.length === 0) {
    return { output: { postsChecked: 0, leadsCreated: 0, message: "No recent posts" } };
  }

  if (!token) {
    await prisma.logEvent.create({
      data: {
        level: "WARN",
        source: "fanpage:engage",
        message: "No Facebook token — skipping live engagement check. Metrics will be empty.",
        organizationId: task.organizationId,
        workspaceId,
        taskId: task.id,
      },
    });
    return { output: { postsChecked: recentPosts.length, leadsCreated: 0, noToken: true } };
  }

  let postsChecked = 0;
  let leadsCreated = 0;

  for (const post of recentPosts) {
    if (!post.externalPostId) continue;

    try {
      const [metrics, comments] = await Promise.all([
        getPostMetrics(post.externalPostId, token),
        getPageComments(post.externalPostId, token),
      ]);

      await prisma.publishedPost.update({
        where: { id: post.id },
        data: {
          metrics: {
            likes: metrics.likes,
            comments: metrics.comments,
            shares: metrics.shares,
            reach: metrics.reach ?? null,
            lastChecked: new Date().toISOString(),
          },
        },
      });

      postsChecked++;

      if (comments.length >= LEAD_COMMENT_THRESHOLD) {
        const existing = await prisma.task.findFirst({
          where: {
            workspaceId,
            labels: { hasEvery: ["lead:follow-up", `post:${post.id}`] },
            status: { notIn: ["COMPLETED", "ARCHIVED"] },
          },
          select: { id: true },
        });

        if (!existing) {
          await prisma.task.create({
            data: {
              title: `Follow up: ${comments.length} comments on post`,
              description: `Post ${post.externalPostId} has ${comments.length} comments and ${metrics.likes} likes. Review engagement and follow up on leads.`,
              status: "QUEUED",
              priority: "HIGH",
              organizationId: task.organizationId,
              workspaceId,
              labels: ["lead:follow-up", `post:${post.id}`],
            },
            select: { id: true },
          });
          leadsCreated++;
        }
      }
    } catch (err) {
      console.error(`[fanpage:engage] Failed for post ${post.id}:`, err);
    }
  }

  await prisma.logEvent.create({
    data: {
      level: "INFO",
      source: "fanpage:engage",
      message: `Engagement check: ${postsChecked} posts checked, ${leadsCreated} leads created`,
      metadata: { postsChecked, leadsCreated },
      organizationId: task.organizationId,
      workspaceId,
      taskId: task.id,
    },
  });

  return { output: { postsChecked, leadsCreated } };
};
