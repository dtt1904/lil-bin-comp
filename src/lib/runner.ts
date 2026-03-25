import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  TaskStatus,
  TaskRunStatus,
  LogLevel,
  ExecutionTarget,
} from "../generated/prisma/enums";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface RunnerConfig {
  runnerId: string;
  target: ExecutionTarget;
  pollIntervalMs: number;
  staleLockMinutes: number;
  maxConcurrent: number;
}

const DEFAULT_CONFIG: RunnerConfig = {
  runnerId: `runner-${process.pid}`,
  target: ExecutionTarget.ANY,
  pollIntervalMs: 5_000,
  staleLockMinutes: 10,
  maxConcurrent: 1,
};

// ---------------------------------------------------------------------------
// Executor registry
// ---------------------------------------------------------------------------

export type ExecutorFn = (
  task: ClaimedTask,
  prisma: PrismaClient
) => Promise<{ output: unknown; tokensUsed?: number; cost?: number }>;

const executors = new Map<string, ExecutorFn>();

export function registerExecutor(label: string, fn: ExecutorFn) {
  executors.set(label, fn);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClaimedTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  organizationId: string;
  workspaceId: string | null;
  assigneeAgentId: string | null;
  labels: string[];
  retryCount: number;
  maxRetries: number;
}

// ---------------------------------------------------------------------------
// Create a standalone Prisma client for the runner process
// ---------------------------------------------------------------------------

export function createRunnerPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

// ---------------------------------------------------------------------------
// Claim: atomic fetch-and-lock of one QUEUED task
// ---------------------------------------------------------------------------

export async function claimNextTask(
  prisma: PrismaClient,
  config: RunnerConfig
): Promise<ClaimedTask | null> {
  const targetFilter: ExecutionTarget[] =
    config.target === ExecutionTarget.ANY
      ? [ExecutionTarget.ANY]
      : [config.target, ExecutionTarget.ANY];

  return prisma.$transaction(async (tx) => {
    const candidate = await tx.task.findFirst({
      where: {
        status: TaskStatus.QUEUED,
        lockedBy: null,
        executionTarget: { in: targetFilter },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    if (!candidate) return null;

    const updated = await tx.task.updateMany({
      where: {
        id: candidate.id,
        status: TaskStatus.QUEUED,
        lockedBy: null,
      },
      data: {
        status: TaskStatus.RUNNING,
        lockedBy: config.runnerId,
        lockedAt: new Date(),
      },
    });

    if (updated.count === 0) return null;

    return {
      id: candidate.id,
      title: candidate.title,
      description: candidate.description,
      priority: candidate.priority,
      organizationId: candidate.organizationId,
      workspaceId: candidate.workspaceId,
      assigneeAgentId: candidate.assigneeAgentId,
      labels: candidate.labels,
      retryCount: candidate.retryCount,
      maxRetries: candidate.maxRetries,
    };
  });
}

// ---------------------------------------------------------------------------
// TaskRun lifecycle: create at start, finalize on complete/fail
// ---------------------------------------------------------------------------

async function createRun(
  prisma: PrismaClient,
  task: ClaimedTask,
  config: RunnerConfig
): Promise<string> {
  const run = await prisma.taskRun.create({
    data: {
      taskId: task.id,
      agentId: task.assigneeAgentId ?? undefined,
      runnerId: config.runnerId,
      status: TaskRunStatus.STARTED,
      input: { labels: task.labels, retryCount: task.retryCount },
    },
  });

  await prisma.logEvent.create({
    data: {
      organizationId: task.organizationId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      agentId: task.assigneeAgentId,
      level: LogLevel.INFO,
      source: "runner",
      message: `Run ${run.id} started by ${config.runnerId} [attempt ${task.retryCount + 1}/${task.maxRetries + 1}]`,
    },
  });

  return run.id;
}

async function completeRun(
  prisma: PrismaClient,
  runId: string,
  task: ClaimedTask,
  config: RunnerConfig,
  output: unknown,
  opts?: { tokensUsed?: number; cost?: number }
) {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const run = await tx.taskRun.update({
      where: { id: runId },
      data: {
        status: TaskRunStatus.COMPLETED,
        output: output as any,
        tokensUsed: opts?.tokensUsed,
        cost: opts?.cost,
        completedAt: now,
      },
    });

    await tx.task.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.COMPLETED,
        lockedBy: null,
        lockedAt: null,
        actualCost: opts?.cost,
      },
    });

    const durationMs = now.getTime() - run.startedAt.getTime();

    await tx.logEvent.create({
      data: {
        organizationId: task.organizationId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        agentId: task.assigneeAgentId,
        level: LogLevel.INFO,
        source: "runner",
        message: `Run ${runId} completed in ${durationMs}ms by ${config.runnerId}`,
      },
    });
  });
}

async function failRun(
  prisma: PrismaClient,
  runId: string,
  task: ClaimedTask,
  config: RunnerConfig,
  error: string
) {
  const now = new Date();
  const canRetry = task.retryCount < task.maxRetries;
  const nextTaskStatus = canRetry ? TaskStatus.QUEUED : TaskStatus.FAILED;

  await prisma.$transaction(async (tx) => {
    const run = await tx.taskRun.update({
      where: { id: runId },
      data: {
        status: TaskRunStatus.FAILED,
        error,
        completedAt: now,
      },
    });

    await tx.task.update({
      where: { id: task.id },
      data: {
        status: nextTaskStatus,
        lockedBy: null,
        lockedAt: null,
        retryCount: canRetry ? task.retryCount + 1 : task.retryCount,
      },
    });

    const durationMs = now.getTime() - run.startedAt.getTime();
    const retryNote = canRetry
      ? ` — re-queued for retry ${task.retryCount + 1}/${task.maxRetries}`
      : ` — no retries left, marked FAILED`;

    await tx.logEvent.create({
      data: {
        organizationId: task.organizationId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        agentId: task.assigneeAgentId,
        level: LogLevel.ERROR,
        source: "runner",
        message: `Run ${runId} failed after ${durationMs}ms by ${config.runnerId}: ${error}${retryNote}`,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Stale lock recovery: release tasks locked > staleLockMinutes ago
// ---------------------------------------------------------------------------

export async function recoverStaleTasks(
  prisma: PrismaClient,
  config: RunnerConfig
): Promise<number> {
  const cutoff = new Date(Date.now() - config.staleLockMinutes * 60_000);

  const stale = await prisma.task.findMany({
    where: {
      status: TaskStatus.RUNNING,
      lockedBy: { not: null },
      lockedAt: { lt: cutoff },
    },
  });

  for (const task of stale) {
    const canRetry = task.retryCount < task.maxRetries;
    const nextStatus = canRetry ? TaskStatus.QUEUED : TaskStatus.FAILED;

    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: task.id },
        data: {
          status: nextStatus,
          lockedBy: null,
          lockedAt: null,
          retryCount: canRetry ? task.retryCount + 1 : task.retryCount,
        },
      });

      // Find any open STARTED/RUNNING run for this task and mark it CANCELLED
      const openRuns = await tx.taskRun.findMany({
        where: {
          taskId: task.id,
          status: { in: [TaskRunStatus.STARTED, TaskRunStatus.RUNNING] },
        },
      });

      for (const run of openRuns) {
        await tx.taskRun.update({
          where: { id: run.id },
          data: {
            status: TaskRunStatus.CANCELLED,
            error: `Stale lock recovery — locked by ${task.lockedBy} since ${task.lockedAt?.toISOString()}`,
            completedAt: new Date(),
          },
        });
      }

      // If no open runs existed, create a CANCELLED run as evidence
      if (openRuns.length === 0) {
        await tx.taskRun.create({
          data: {
            taskId: task.id,
            agentId: task.assigneeAgentId ?? undefined,
            runnerId: task.lockedBy,
            status: TaskRunStatus.CANCELLED,
            error: `Stale lock recovery — no run record found, locked by ${task.lockedBy} since ${task.lockedAt?.toISOString()}`,
            completedAt: new Date(),
          },
        });
      }

      await tx.logEvent.create({
        data: {
          organizationId: task.organizationId,
          workspaceId: task.workspaceId,
          taskId: task.id,
          level: LogLevel.WARN,
          source: "runner",
          message: `Stale lock recovered by ${config.runnerId} (was locked by ${task.lockedBy} since ${task.lockedAt?.toISOString()}, ${openRuns.length} open run(s) cancelled)${canRetry ? " — re-queued" : " — marked FAILED"}`,
        },
      });
    });
  }

  return stale.length;
}

// ---------------------------------------------------------------------------
// Execute a single claimed task
// ---------------------------------------------------------------------------

async function executeTask(
  prisma: PrismaClient,
  task: ClaimedTask,
  config: RunnerConfig
) {
  // Always create a TaskRun record first — this is the source of truth
  const runId = await createRun(prisma, task, config);

  const label = task.labels.find((l) => executors.has(l));
  const executor = label ? executors.get(label)! : executors.get("default");

  if (label) {
    console.log(`[runner] Dispatching task ${task.id} to executor "${label}"`);
  } else {
    console.warn(`[runner] No matching executor for labels [${task.labels.join(", ")}] — falling back to "default"`);
  }

  if (!executor) {
    await failRun(
      prisma,
      runId,
      task,
      config,
      `No executor found for labels: [${task.labels.join(", ")}]`
    );
    return;
  }

  // Mark run as actively processing
  await prisma.taskRun.update({
    where: { id: runId },
    data: { status: TaskRunStatus.RUNNING },
  });

  try {
    const result = await executor(task, prisma);
    await completeRun(prisma, runId, task, config, result.output, {
      tokensUsed: result.tokensUsed,
      cost: result.cost,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failRun(prisma, runId, task, config, message);
  }
}

// ---------------------------------------------------------------------------
// Main runner loop
// ---------------------------------------------------------------------------

export async function runLoop(userConfig?: Partial<RunnerConfig>) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const prisma = createRunnerPrisma();

  console.log(`[runner] Starting ${config.runnerId}`);
  console.log(`[runner] Target: ${config.target}, Poll: ${config.pollIntervalMs}ms, Stale: ${config.staleLockMinutes}min`);
  console.log(`[runner] Registered executors: ${Array.from(executors.keys()).join(", ") || "(none)"}`);

  let cycleCount = 0;

  const shutdown = () => {
    console.log(`\n[runner] Shutting down ${config.runnerId}...`);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  while (true) {
    try {
      cycleCount++;

      if (cycleCount % 12 === 0) {
        const recovered = await recoverStaleTasks(prisma, config);
        if (recovered > 0) {
          console.log(`[runner] Recovered ${recovered} stale task(s)`);
        }
      }

      const task = await claimNextTask(prisma, config);

      if (task) {
        const t0 = Date.now();
        console.log(`[runner] Claimed: "${task.title}" (${task.id}) [attempt ${task.retryCount + 1}/${task.maxRetries + 1}]`);
        await executeTask(prisma, task, config);
        console.log(`[runner] Done: "${task.title}" in ${Date.now() - t0}ms`);
        continue;
      }
    } catch (err) {
      console.error(`[runner] Cycle error:`, err instanceof Error ? err.message : err);
    }

    await sleep(config.pollIntervalMs);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
