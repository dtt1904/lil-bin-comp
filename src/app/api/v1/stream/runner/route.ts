import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateStreamRequest } from "@/lib/api-auth";
import { createSseResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

async function loadRunner(organizationId: string) {
  const oneHourAgo = new Date(Date.now() - 3_600_000);
  const staleCutoff = new Date(Date.now() - 10 * 60_000);

  const [queued, running, staleLocks, recentRuns, completedLastHour, failedLastHour] =
    await Promise.all([
      prisma.task.count({ where: { organizationId, status: "QUEUED" } }),
      prisma.task.count({
        where: { organizationId, status: "RUNNING", lockedBy: { not: null } },
      }),
      prisma.task.count({
        where: {
          organizationId,
          status: "RUNNING",
          lockedBy: { not: null },
          lockedAt: { lt: staleCutoff },
        },
      }),
      prisma.taskRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 8,
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

  return {
    queue: { queued, running, staleLocks },
    lastHour: { completed: completedLastHour, failed: failedLastHour },
    recentRuns,
  };
}

export async function GET(req: NextRequest) {
  const auth = authenticateStreamRequest(req);
  if (!auth.ok) return auth.response;

  return createSseResponse((send) => {
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      try {
        send("runner", { data: await loadRunner(auth.ctx.organizationId) });
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : String(err) });
      }
    };

    void tick();
    const id = setInterval(() => void tick(), 3000);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  });
}
