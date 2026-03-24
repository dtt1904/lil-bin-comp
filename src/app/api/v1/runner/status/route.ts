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
    const [queued, running, stale, recentRuns] = await Promise.all([
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
        },
        orderBy: { lockedAt: "desc" },
      }),
      prisma.task.count({
        where: {
          status: "RUNNING",
          lockedBy: { not: null },
          lockedAt: { lt: new Date(Date.now() - 10 * 60_000) },
        },
      }),
      prisma.taskRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 10,
        select: {
          id: true,
          taskId: true,
          status: true,
          startedAt: true,
          completedAt: true,
          cost: true,
        },
      }),
    ]);

    return jsonResponse({
      data: {
        queuedCount: queued,
        runningTasks: running,
        staleLockCount: stale,
        recentRuns,
      },
    });
  } catch (err) {
    return errorResponse(
      `Runner status error: ${err instanceof Error ? err.message : err}`,
      500
    );
  }
}
