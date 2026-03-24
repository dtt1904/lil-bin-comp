import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const oneHourAgo = new Date(Date.now() - 3_600_000);
    const staleCutoff = new Date(Date.now() - 10 * 60_000);

    const [
      queued,
      running,
      stale,
      recentRuns,
      recentFailures,
      completedLastHour,
      failedLastHour,
    ] = await Promise.all([
      prisma.task.count({ where: { status: "QUEUED" } }),

      prisma.task.findMany({
        where: { status: "RUNNING", lockedBy: { not: null } },
        select: {
          id: true,
          title: true,
          lockedBy: true,
          lockedAt: true,
          priority: true,
          executionTarget: true,
          retryCount: true,
          maxRetries: true,
          assigneeAgentId: true,
        },
        orderBy: { lockedAt: "desc" },
      }),

      prisma.task.count({
        where: {
          status: "RUNNING",
          lockedBy: { not: null },
          lockedAt: { lt: staleCutoff },
        },
      }),

      prisma.taskRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 15,
        select: {
          id: true,
          taskId: true,
          agentId: true,
          runnerId: true,
          status: true,
          error: true,
          startedAt: true,
          completedAt: true,
          cost: true,
        },
      }),

      prisma.taskRun.findMany({
        where: {
          status: { in: ["FAILED", "CANCELLED"] },
          completedAt: { gte: oneHourAgo },
        },
        orderBy: { completedAt: "desc" },
        take: 10,
        select: {
          id: true,
          taskId: true,
          runnerId: true,
          status: true,
          error: true,
          startedAt: true,
          completedAt: true,
        },
      }),

      prisma.taskRun.count({
        where: { status: "COMPLETED", completedAt: { gte: oneHourAgo } },
      }),

      prisma.taskRun.count({
        where: {
          status: { in: ["FAILED", "CANCELLED"] },
          completedAt: { gte: oneHourAgo },
        },
      }),
    ]);

    return jsonResponse({
      data: {
        queue: {
          queued,
          running: running.length,
          staleLocks: stale,
        },
        lastHour: {
          completed: completedLastHour,
          failed: failedLastHour,
        },
        runningTasks: running,
        recentRuns,
        recentFailures,
      },
    });
  } catch (err) {
    return errorResponse(
      `Runner status error: ${err instanceof Error ? err.message : err}`,
      500
    );
  }
}
