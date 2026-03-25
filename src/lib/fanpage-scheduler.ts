/**
 * Fanpage Scheduler — runs alongside the main runner loop.
 *
 * Periodically iterates all workspaces with an active `social-media-manager`
 * ModuleInstallation, reads their config JSON, and creates QUEUED pipeline
 * tasks (fanpage:discover, fanpage:draft, fanpage:post, fanpage:engage)
 * when duplicates don't already exist.
 */

import type { PrismaClient } from "../generated/prisma/client";

interface FanpageConfig {
  mode?: "dry_run" | "review" | "live";
  scheduleIntervalMinutes?: number;
  autoDiscover?: boolean;
  autoDraft?: boolean;
  autoPost?: boolean;
  autoEngage?: boolean;
  contentSourcePath?: string;
  platforms?: string[];
  approvalRequired?: boolean;
  [key: string]: unknown;
}

const PIPELINE_LABELS = [
  "fanpage:discover",
  "fanpage:draft",
  "fanpage:post",
  "fanpage:engage",
] as const;

type PipelineLabel = (typeof PIPELINE_LABELS)[number];

const LABEL_TO_CONFIG_FLAG: Record<PipelineLabel, keyof FanpageConfig> = {
  "fanpage:discover": "autoDiscover",
  "fanpage:draft": "autoDraft",
  "fanpage:post": "autoPost",
  "fanpage:engage": "autoEngage",
};

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

async function createPipelineTask(
  prisma: PrismaClient,
  orgId: string,
  workspaceId: string,
  label: PipelineLabel
): Promise<void> {
  await prisma.task.create({
    data: {
      title: `Fanpage pipeline: ${label.replace("fanpage:", "")}`,
      description: `Auto-scheduled fanpage pipeline task`,
      status: "QUEUED",
      priority: "MEDIUM",
      executionTarget: "MAC_MINI",
      organizationId: orgId,
      workspaceId,
      labels: [label],
    },
    select: { id: true },
  });
}

/**
 * Run one cycle of the fanpage scheduler. Intended to be called
 * periodically (e.g. every 5 minutes) from the runner entry point.
 */
export async function runFanpageSchedulerCycle(
  prisma: PrismaClient
): Promise<{ scheduled: number; workspacesChecked: number }> {
  const installations = await prisma.moduleInstallation.findMany({
    where: {
      moduleType: "social-media-manager",
      status: "ACTIVE",
    },
    select: {
      workspaceId: true,
      organizationId: true,
      config: true,
    },
  });

  let scheduled = 0;

  for (const install of installations) {
    const config = (install.config ?? {}) as FanpageConfig;

    for (const label of PIPELINE_LABELS) {
      const flagKey = LABEL_TO_CONFIG_FLAG[label];
      const enabled = config[flagKey];
      if (enabled === false && !(label === "fanpage:post" && config.mode === "live")) continue;

      const alreadyActive = await hasActiveTask(
        prisma,
        install.workspaceId,
        label
      );
      if (alreadyActive) continue;

      await createPipelineTask(
        prisma,
        install.organizationId,
        install.workspaceId,
        label
      );
      scheduled++;
    }
  }

  if (scheduled > 0) {
    console.log(
      `[fanpage-scheduler] Scheduled ${scheduled} tasks across ${installations.length} workspaces`
    );
  }

  return { scheduled, workspacesChecked: installations.length };
}

/**
 * Start a repeating scheduler loop. Returns a cleanup function.
 */
export function startFanpageScheduler(
  prisma: PrismaClient,
  intervalMs = 5 * 60 * 1000
): () => void {
  console.log(
    `[fanpage-scheduler] Starting scheduler loop (interval: ${intervalMs / 1000}s)`
  );

  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runFanpageSchedulerCycle(prisma);
    } catch (err) {
      console.error("[fanpage-scheduler] Cycle error:", err);
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
