import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  TaskStatus,
  TaskRunStatus,
  LogLevel,
  ExecutionTarget,
} from "@/generated/prisma/enums";

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
// Complete / Fail helpers
// ---------------------------------------------------------------------------

export async function completeTask(
  prisma: PrismaClient,
  task: ClaimedTask,
  output: unknown,
  opts?: { tokensUsed?: number; cost?: number }
) {
  const agentId = task.assigneeAgentId;

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.COMPLETED,
        lockedBy: null,
        lockedAt: null,
        actualCost: opts?.cost,
      },
    });

    if (agentId) {
      await tx.taskRun.create({
        data: {
          taskId: task.id,
          agentId,
          status: TaskRunStatus.COMPLETED,
          output: output as any,
          tokensUsed: opts?.tokensUsed,
          cost: opts?.cost,
          completedAt: new Date(),
        },
      });
    }

    await tx.logEvent.create({
      data: {
        organizationId: task.organizationId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        agentId,
        level: LogLevel.INFO,
        source: "runner",
        message: `Task completed by runner`,
      },
    });
  });
}

export async function failTask(
  prisma: PrismaClient,
  task: ClaimedTask,
  error: string,
  config: RunnerConfig
) {
  const canRetry = task.retryCount < task.maxRetries;
  const nextStatus = canRetry ? TaskStatus.QUEUED : TaskStatus.FAILED;
  const agentId = task.assigneeAgentId;

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

    if (agentId) {
      await tx.taskRun.create({
        data: {
          taskId: task.id,
          agentId,
          status: TaskRunStatus.FAILED,
          error,
          completedAt: new Date(),
        },
      });
    }

    await tx.logEvent.create({
      data: {
        organizationId: task.organizationId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        agentId,
        level: LogLevel.ERROR,
        source: "runner",
        message: canRetry
          ? `Task failed (retry ${task.retryCount + 1}/${task.maxRetries}): ${error}`
          : `Task failed permanently after ${task.retryCount} retries: ${error}`,
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

    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: canRetry ? TaskStatus.QUEUED : TaskStatus.FAILED,
        lockedBy: null,
        lockedAt: null,
        retryCount: canRetry ? task.retryCount + 1 : task.retryCount,
      },
    });

    await prisma.logEvent.create({
      data: {
        organizationId: task.organizationId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        level: LogLevel.WARN,
        source: "runner",
        message: `Stale lock recovered (locked by ${task.lockedBy} at ${task.lockedAt?.toISOString()})${canRetry ? " — re-queued" : " — marked FAILED"}`,
      },
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
  const label = task.labels.find((l) => executors.has(l));
  const executor = label ? executors.get(label)! : executors.get("default");

  if (!executor) {
    await failTask(prisma, task, `No executor found for labels: [${task.labels.join(", ")}]`, config);
    return;
  }

  try {
    const result = await executor(task, prisma);
    await completeTask(prisma, task, result.output, {
      tokensUsed: result.tokensUsed,
      cost: result.cost,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failTask(prisma, task, message, config);
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
    console.log(`\n[runner] Shutting down...`);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  while (true) {
    try {
      cycleCount++;

      // Recover stale tasks every 12 cycles (~60s at 5s poll)
      if (cycleCount % 12 === 0) {
        const recovered = await recoverStaleTasks(prisma, config);
        if (recovered > 0) {
          console.log(`[runner] Recovered ${recovered} stale task(s)`);
        }
      }

      const task = await claimNextTask(prisma, config);

      if (task) {
        console.log(`[runner] Claimed: "${task.title}" (${task.id})`);
        await executeTask(prisma, task, config);
        console.log(`[runner] Done: "${task.title}"`);
        continue; // immediately check for more work
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
