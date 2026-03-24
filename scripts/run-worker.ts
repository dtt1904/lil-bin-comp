/**
 * lil_Bin local task runner.
 *
 * Usage:
 *   npx tsx scripts/run-worker.ts                     # default
 *   npx tsx scripts/run-worker.ts --target MAC_MINI   # only MAC_MINI + ANY tasks
 *   npx tsx scripts/run-worker.ts --poll 3000         # 3s poll interval
 */

import "dotenv/config";

import {
  runLoop,
  registerExecutor,
  type ClaimedTask,
  type ExecutorFn,
} from "../src/lib/runner";
import type { PrismaClient } from "../src/generated/prisma/client";
import { ExecutionTarget } from "../src/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Demo executor: "system-health-check"
//
// Queries real DB counts and produces a structured health report.
// Tag a task with label "health-check" to trigger this executor.
// ---------------------------------------------------------------------------

const healthCheckExecutor: ExecutorFn = async (
  task: ClaimedTask,
  prisma: PrismaClient
) => {
  const start = Date.now();

  const [
    taskCounts,
    agentCount,
    approvalCount,
    recentLogs,
    workspaceCount,
  ] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.agent.count(),
    prisma.approval.count({ where: { status: "PENDING" } }),
    prisma.logEvent.count({
      where: { createdAt: { gte: new Date(Date.now() - 3_600_000) } },
    }),
    prisma.workspace.count(),
  ]);

  const statusMap: Record<string, number> = {};
  for (const row of taskCounts) {
    statusMap[row.status] = row._count.id;
  }

  const elapsedMs = Date.now() - start;

  return {
    output: {
      report: "system-health-check",
      generatedAt: new Date().toISOString(),
      elapsedMs,
      tasksByStatus: statusMap,
      totalAgents: agentCount,
      pendingApprovals: approvalCount,
      logsLastHour: recentLogs,
      workspaces: workspaceCount,
    },
  };
};

// ---------------------------------------------------------------------------
// Default executor: echoes task metadata as output
// ---------------------------------------------------------------------------

const defaultExecutor: ExecutorFn = async (task: ClaimedTask) => {
  await new Promise((r) => setTimeout(r, 1_000));
  return {
    output: {
      echo: true,
      taskId: task.id,
      title: task.title,
      executedAt: new Date().toISOString(),
      message: "Default executor — task processed successfully.",
    },
  };
};

// ---------------------------------------------------------------------------
// Register & start
// ---------------------------------------------------------------------------

registerExecutor("health-check", healthCheckExecutor);
registerExecutor("default", defaultExecutor);

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const targetArg = getArg("target")?.toUpperCase();
const target =
  targetArg === "MAC_MINI"
    ? ExecutionTarget.MAC_MINI
    : targetArg === "CLOUD"
      ? ExecutionTarget.CLOUD
      : ExecutionTarget.ANY;

const poll = parseInt(getArg("poll") || "5000", 10);

runLoop({
  runnerId: `worker-${process.pid}`,
  target,
  pollIntervalMs: poll,
}).catch((err) => {
  console.error("[runner] Fatal:", err);
  process.exit(1);
});
