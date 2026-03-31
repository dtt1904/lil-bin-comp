/**
 * LangGraph supervisor executors.
 *
 * These plug into the existing runner label-based dispatch system.
 * Labels: supervisor:plan, supervisor:monitor, supervisor:report
 */

import { registerExecutor, type ClaimedTask, type ExecutorFn } from "../runner";
import type { PrismaClient } from "../../generated/prisma/client";
import { runSupervisor } from "./supervisor";

async function resolveWorkspace(
  prisma: PrismaClient,
  task: ClaimedTask
): Promise<{ id: string; name: string; organizationId: string } | null> {
  if (!task.workspaceId) return null;
  try {
    const ws = await prisma.workspace.findUnique({
      where: { id: task.workspaceId },
      select: { id: true, name: true, organizationId: true },
    });
    return ws;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// supervisor:plan — break an objective into queued tasks
// ---------------------------------------------------------------------------

const supervisorPlanExecutor: ExecutorFn = async (task, prisma) => {
  const ws = await resolveWorkspace(prisma, task);
  if (!ws) {
    return { output: { error: "No workspace found for supervisor:plan" } };
  }

  const objective = task.description || "Run standard workspace operations cycle";
  console.log(`[supervisor:plan] Workspace: ${ws.name}, Objective: "${objective}"`);

  const result = await runSupervisor(prisma, {
    workspaceId: ws.id,
    workspaceName: ws.name,
    organizationId: ws.organizationId,
    objective,
    mode: "plan",
  });

  await prisma.logEvent.create({
    data: {
      level: "INFO",
      source: "supervisor:plan",
      message: `Planned ${result.plan.length} tasks, ${result.decisions.length} decisions`,
      metadata: {
        planned: result.plan.length,
        decisions: result.decisions.length,
        objective,
      } as Record<string, string | number | boolean | null>,
      organizationId: ws.organizationId,
      workspaceId: ws.id,
      taskId: task.id,
    },
  });

  return {
    output: {
      planned: result.plan.length,
      decisions: result.decisions,
      summary: result.summary,
    },
  };
};

// ---------------------------------------------------------------------------
// supervisor:monitor — check health, classify failures, create remediation
// ---------------------------------------------------------------------------

const supervisorMonitorExecutor: ExecutorFn = async (task, prisma) => {
  const ws = await resolveWorkspace(prisma, task);
  if (!ws) {
    return { output: { error: "No workspace found for supervisor:monitor" } };
  }

  console.log(`[supervisor:monitor] Checking workspace: ${ws.name}`);

  const result = await runSupervisor(prisma, {
    workspaceId: ws.id,
    workspaceName: ws.name,
    organizationId: ws.organizationId,
    objective: "Monitor workspace health and handle failures",
    mode: "monitor",
  });

  await prisma.logEvent.create({
    data: {
      level: result.taskResults.some((r) => r.status === "FAILED") ? "WARN" : "INFO",
      source: "supervisor:monitor",
      message: result.summary.slice(0, 500),
      metadata: {
        failedTasks: result.taskResults.filter((r) => r.status === "FAILED").length,
        decisions: result.decisions.length,
      } as Record<string, string | number | boolean | null>,
      organizationId: ws.organizationId,
      workspaceId: ws.id,
      taskId: task.id,
    },
  });

  return {
    output: {
      health: result.summary,
      failedTasks: result.taskResults.filter((r) => r.status === "FAILED").length,
      decisions: result.decisions,
    },
  };
};

// ---------------------------------------------------------------------------
// supervisor:report — generate executive summary
// ---------------------------------------------------------------------------

const supervisorReportExecutor: ExecutorFn = async (task, prisma) => {
  const ws = await resolveWorkspace(prisma, task);
  if (!ws) {
    return { output: { error: "No workspace found for supervisor:report" } };
  }

  console.log(`[supervisor:report] Generating report for: ${ws.name}`);

  const result = await runSupervisor(prisma, {
    workspaceId: ws.id,
    workspaceName: ws.name,
    organizationId: ws.organizationId,
    objective: "Generate executive summary of workspace status",
    mode: "report",
  });

  await prisma.logEvent.create({
    data: {
      level: "INFO",
      source: "supervisor:report",
      message: `Report generated for ${ws.name}`,
      metadata: {
        reportLength: result.summary.length,
      } as Record<string, string | number | boolean | null>,
      organizationId: ws.organizationId,
      workspaceId: ws.id,
      taskId: task.id,
    },
  });

  return {
    output: {
      report: result.summary,
      decisions: result.decisions.length,
    },
  };
};

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerSupervisorExecutors(): void {
  registerExecutor("supervisor:plan", supervisorPlanExecutor);
  registerExecutor("supervisor:monitor", supervisorMonitorExecutor);
  registerExecutor("supervisor:report", supervisorReportExecutor);
  console.log("[executors] Registered supervisor executors: plan, monitor, report");
}
