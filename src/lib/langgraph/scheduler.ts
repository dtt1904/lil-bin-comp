/**
 * Supervisor scheduler — auto-creates supervisor:monitor and supervisor:report
 * tasks for all workspaces with LangGraph enabled.
 *
 * Runs alongside the existing fanpage scheduler in the runner.
 */

import type { PrismaClient } from "../../generated/prisma/client";

const SUPERVISOR_LABELS = [
  "supervisor:monitor",
  "supervisor:report",
] as const;

async function hasActiveTask(
  prisma: PrismaClient,
  workspaceId: string,
  label: string
): Promise<boolean> {
  const count = await prisma.task.count({
    where: {
      workspaceId,
      labels: { has: label },
      status: { in: ["QUEUED", "RUNNING"] },
    },
  });
  return count > 0;
}

export async function runSupervisorSchedulerCycle(
  prisma: PrismaClient
): Promise<{ scheduled: number; workspacesChecked: number }> {
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true, organizationId: true, metadata: true },
  });

  let scheduled = 0;

  for (const ws of workspaces) {
    const meta = (ws.metadata ?? {}) as Record<string, unknown>;
    if (meta.useLangGraph === false) continue;

    for (const label of SUPERVISOR_LABELS) {
      const active = await hasActiveTask(prisma, ws.id, label);
      if (active) continue;

      await prisma.task.create({
        data: {
          title: `Supervisor: ${label.replace("supervisor:", "")} — ${ws.name}`,
          description: `Auto-scheduled supervisor task for workspace ${ws.name}`,
          status: "QUEUED",
          priority: "LOW",
          executionTarget: "MAC_MINI",
          organizationId: ws.organizationId,
          workspaceId: ws.id,
          labels: [label],
        },
        select: { id: true },
      });
      scheduled++;
    }
  }

  if (scheduled > 0) {
    console.log(`[supervisor-scheduler] Scheduled ${scheduled} tasks across ${workspaces.length} workspaces`);
  }

  return { scheduled, workspacesChecked: workspaces.length };
}

export function startSupervisorScheduler(
  prisma: PrismaClient,
  intervalMs = 10 * 60 * 1000
): () => void {
  console.log(`[supervisor-scheduler] Starting (interval: ${intervalMs / 1000}s)`);

  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runSupervisorSchedulerCycle(prisma);
    } catch (err) {
      console.error("[supervisor-scheduler] Cycle error:", err);
    } finally {
      running = false;
    }
  };

  tick();
  timer = setInterval(tick, intervalMs);

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
