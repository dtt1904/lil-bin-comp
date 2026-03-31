/**
 * LangGraph Supervisor — the "brain" of lil_Bin.
 *
 * Three modes:
 *   plan    — break an objective into executable tasks
 *   monitor — check workspace health, classify failures, create remediation
 *   report  — summarize outcomes for the owner
 *
 * Uses OpenAI (gpt-4o) when OPENAI_API_KEY is set;
 * degrades to rule-based logic otherwise.
 */

import { StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PrismaClient } from "../../generated/prisma/client";
import {
  SupervisorState,
  type SupervisorStateType,
  type PlannedTask,
  type SupervisorDecision,
  type WorkspaceHealth,
  type TaskResult,
} from "./types";
import { classifyFailure, canAutoApprove } from "./policies";

// ---------------------------------------------------------------------------
// LLM (optional — graceful degradation when no key)
// ---------------------------------------------------------------------------

function getLLM(): ChatOpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.3,
    maxTokens: 2048,
    openAIApiKey: key,
  });
}

// ---------------------------------------------------------------------------
// Node: Plan — break objective into tasks
// ---------------------------------------------------------------------------

async function planNode(
  state: SupervisorStateType,
  config?: { prisma?: PrismaClient }
): Promise<Partial<SupervisorStateType>> {
  const prisma = config?.prisma;
  const llm = getLLM();

  console.log(`[supervisor] Plan node: workspace=${state.workspaceName}, objective="${state.objective}"`);

  if (llm) {
    try {
      const systemPrompt = [
        `You are the supervisor agent for workspace "${state.workspaceName}".`,
        "Your job: break the given objective into concrete executable tasks.",
        "Each task needs: title, description, label (e.g. fanpage:discover, fanpage:draft, fanpage:post, fanpage:engage, health-check), priority (LOW/MEDIUM/HIGH), and whether it requires approval.",
        "Return ONLY valid JSON: { \"tasks\": [...] }",
        "Available labels: fanpage:discover, fanpage:draft, fanpage:post, fanpage:engage, health-check, supervisor:monitor, supervisor:report",
      ].join("\n");

      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(`Objective: ${state.objective}`),
      ]);

      const content = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const tasks: PlannedTask[] = (parsed.tasks ?? []).map((t: Record<string, unknown>) => ({
          title: String(t.title ?? "Untitled"),
          description: String(t.description ?? ""),
          label: String(t.label ?? "health-check"),
          priority: (["LOW", "MEDIUM", "HIGH"].includes(String(t.priority)) ? t.priority : "MEDIUM") as PlannedTask["priority"],
          departmentSlug: t.departmentSlug ? String(t.departmentSlug) : undefined,
          requiresApproval: Boolean(t.requiresApproval),
        }));

        const decisions: SupervisorDecision[] = tasks.map((t) => ({
          action: "create_task" as const,
          reason: `Planned from objective: ${state.objective}`,
          taskLabel: t.label,
          taskTitle: t.title,
          timestamp: new Date().toISOString(),
        }));

        console.log(`[supervisor] LLM planned ${tasks.length} tasks`);
        return { plan: tasks, decisions };
      }
    } catch (err) {
      console.error("[supervisor] LLM plan failed, falling back to rules:", err);
    }
  }

  const tasks = ruleBased_plan(state);
  const decisions: SupervisorDecision[] = tasks.map((t) => ({
    action: "create_task" as const,
    reason: `Rule-based plan (no LLM): ${state.objective}`,
    taskLabel: t.label,
    taskTitle: t.title,
    timestamp: new Date().toISOString(),
  }));

  console.log(`[supervisor] Rule-based plan: ${tasks.length} tasks`);
  return { plan: tasks, decisions };
}

function ruleBased_plan(state: SupervisorStateType): PlannedTask[] {
  const obj = state.objective.toLowerCase();
  const tasks: PlannedTask[] = [];

  if (obj.includes("fanpage") || obj.includes("post") || obj.includes("content")) {
    tasks.push(
      { title: "Discover new content", description: "Scan content source for new files", label: "fanpage:discover", priority: "MEDIUM", requiresApproval: false },
      { title: "Draft captions", description: "Generate captions for discovered content", label: "fanpage:draft", priority: "MEDIUM", requiresApproval: false },
      { title: "Post to Facebook", description: "Publish approved drafts", label: "fanpage:post", priority: "HIGH", requiresApproval: true },
      { title: "Monitor engagement", description: "Check comments, leads, metrics", label: "fanpage:engage", priority: "LOW", requiresApproval: false },
    );
  }

  if (obj.includes("health") || obj.includes("check") || obj.includes("status")) {
    tasks.push({
      title: "System health check",
      description: "Run full health check across workspace",
      label: "health-check",
      priority: "LOW",
      requiresApproval: false,
    });
  }

  if (tasks.length === 0) {
    tasks.push({
      title: "Health check (default)",
      description: `No specific plan for: ${state.objective}`,
      label: "health-check",
      priority: "LOW",
      requiresApproval: false,
    });
  }

  return tasks;
}

// ---------------------------------------------------------------------------
// Node: Execute plan — create tasks in DB
// ---------------------------------------------------------------------------

async function executeNode(
  state: SupervisorStateType,
  config?: { prisma?: PrismaClient }
): Promise<Partial<SupervisorStateType>> {
  const prisma = config?.prisma;
  if (!prisma) {
    return { error: "No Prisma client available" };
  }

  const created: SupervisorDecision[] = [];

  for (const planned of state.plan) {
    const mode = await getWorkspaceMode(prisma, state.workspaceId);
    const autoApprove = canAutoApprove(planned.label, mode);

    if (planned.requiresApproval && !autoApprove) {
      created.push({
        action: "request_review",
        reason: `High-risk task "${planned.title}" requires manual approval in ${mode} mode`,
        taskLabel: planned.label,
        taskTitle: planned.title,
        timestamp: new Date().toISOString(),
      });
      console.log(`[supervisor] Skipping "${planned.title}" — requires approval in ${mode} mode`);
      continue;
    }

    try {
      await prisma.task.create({
        data: {
          title: planned.title,
          description: planned.description,
          status: "QUEUED",
          priority: planned.priority,
          executionTarget: "MAC_MINI",
          organizationId: state.organizationId,
          workspaceId: state.workspaceId,
          labels: [planned.label],
        },
        select: { id: true },
      });

      created.push({
        action: "create_task",
        reason: `Created and queued: ${planned.title}`,
        taskLabel: planned.label,
        taskTitle: planned.title,
        timestamp: new Date().toISOString(),
      });
      console.log(`[supervisor] Created task: "${planned.title}" [${planned.label}]`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[supervisor] Failed to create "${planned.title}":`, msg);
      created.push({
        action: "escalate",
        reason: `Failed to create task: ${msg}`,
        taskLabel: planned.label,
        taskTitle: planned.title,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { decisions: created };
}

// ---------------------------------------------------------------------------
// Node: Monitor — check workspace health, classify failures
// ---------------------------------------------------------------------------

async function monitorNode(
  state: SupervisorStateType,
  config?: { prisma?: PrismaClient }
): Promise<Partial<SupervisorStateType>> {
  const prisma = config?.prisma;
  if (!prisma) {
    return { error: "No Prisma client available" };
  }

  console.log(`[supervisor] Monitor: checking workspace ${state.workspaceName}`);

  const health = await getWorkspaceHealth(prisma, state.workspaceId, state.workspaceName);
  const decisions: SupervisorDecision[] = [];
  const results: TaskResult[] = [];

  const failedTasks = await prisma.task.findMany({
    where: {
      workspaceId: state.workspaceId,
      status: "FAILED",
      updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true, title: true, labels: true },
    take: 10,
  });

  for (const ft of failedTasks) {
    const lastRun = await prisma.taskRun.findFirst({
      where: { taskId: ft.id, status: "FAILED" },
      orderBy: { completedAt: "desc" },
      select: { error: true, completedAt: true },
    });

    const classified = classifyFailure(lastRun?.error ?? "unknown error");

    results.push({
      taskId: ft.id,
      title: ft.title,
      status: "FAILED",
      error: lastRun?.error ?? undefined,
    });

    decisions.push({
      action: classified.action === "retry" ? "retry_task" : "escalate",
      reason: `[${classified.category}] ${classified.message.slice(0, 200)}`,
      taskLabel: ft.labels[0],
      taskTitle: ft.title,
      timestamp: new Date().toISOString(),
    });

    console.log(`[supervisor] Failed task "${ft.title}": ${classified.category} -> ${classified.action}`);
  }

  if (health.tasksFailed24h === 0 && health.tasksQueued === 0) {
    decisions.push({
      action: "report",
      reason: "Workspace healthy — no failures, no pending tasks",
      timestamp: new Date().toISOString(),
    });
  }

  const summaryParts = [
    `Health: ${health.tasksCompleted24h} completed, ${health.tasksFailed24h} failed, ${health.tasksQueued} queued`,
    `Active modules: ${health.activeModules.join(", ") || "none"}`,
  ];
  if (health.recentErrors.length > 0) {
    summaryParts.push(`Recent errors: ${health.recentErrors.slice(0, 3).join("; ")}`);
  }

  return {
    summary: summaryParts.join("\n"),
    taskResults: results,
    decisions,
  };
}

// ---------------------------------------------------------------------------
// Node: Report — generate summary
// ---------------------------------------------------------------------------

async function reportNode(
  state: SupervisorStateType
): Promise<Partial<SupervisorStateType>> {
  const llm = getLLM();

  if (llm) {
    try {
      const response = await llm.invoke([
        new SystemMessage(
          `You are the supervisor for workspace "${state.workspaceName}". Write a concise executive summary (3-5 bullet points) of the current status. Include: tasks completed, failures and their causes, recommendations. Be direct and actionable.`
        ),
        new HumanMessage(
          `Current state:\n${state.summary}\n\nDecisions made: ${state.decisions.length}\nTask results: ${state.taskResults.length}\nRecent decisions:\n${state.decisions.slice(-5).map((d) => `- [${d.action}] ${d.reason}`).join("\n")}`
        ),
      ]);

      const content = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

      console.log(`[supervisor] LLM report generated (${content.length} chars)`);
      return { summary: content };
    } catch (err) {
      console.error("[supervisor] LLM report failed:", err);
    }
  }

  const report = [
    `=== Workspace Report: ${state.workspaceName} ===`,
    state.summary,
    "",
    `Decisions (${state.decisions.length}):`,
    ...state.decisions.slice(-10).map((d) => `  [${d.action}] ${d.reason}`),
  ].join("\n");

  console.log(`[supervisor] Rule-based report generated`);
  return { summary: report };
}

// ---------------------------------------------------------------------------
// Graph construction
// ---------------------------------------------------------------------------

function routeByMode(state: SupervisorStateType): string {
  switch (state.mode) {
    case "plan":
      return "plan";
    case "monitor":
      return "monitor";
    case "report":
      return "report";
    default:
      return "plan";
  }
}

function afterPlan(state: SupervisorStateType): string {
  if (state.plan.length > 0) return "execute";
  return "report";
}

export function buildSupervisorGraph() {
  const graph = new StateGraph(SupervisorState)
    .addNode("plan", planNode as any)
    .addNode("execute", executeNode as any)
    .addNode("monitor", monitorNode as any)
    .addNode("report", reportNode as any)
    .addConditionalEdges("__start__", routeByMode)
    .addConditionalEdges("plan", afterPlan)
    .addEdge("execute", "report")
    .addEdge("monitor", "report")
    .addEdge("report", END);

  return graph.compile();
}

// ---------------------------------------------------------------------------
// Convenience runner: invoke the graph
// ---------------------------------------------------------------------------

export async function runSupervisor(
  prisma: PrismaClient,
  input: {
    workspaceId: string;
    workspaceName: string;
    organizationId: string;
    objective: string;
    mode: "plan" | "monitor" | "report";
  }
): Promise<SupervisorStateType> {
  const graph = buildSupervisorGraph();

  const result = await graph.invoke(
    {
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName,
      organizationId: input.organizationId,
      objective: input.objective,
      mode: input.mode,
    },
    { configurable: { prisma } }
  );

  return result as SupervisorStateType;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getWorkspaceMode(
  prisma: PrismaClient,
  workspaceId: string
): Promise<string> {
  try {
    const install = await prisma.moduleInstallation.findFirst({
      where: { workspaceId, moduleType: "social-media-manager", status: "ACTIVE" },
      select: { config: true },
    });
    const config = (install?.config ?? {}) as Record<string, unknown>;
    return String(config.mode ?? "review");
  } catch {
    return "review";
  }
}

async function getWorkspaceHealth(
  prisma: PrismaClient,
  workspaceId: string,
  workspaceName: string
): Promise<WorkspaceHealth> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [queued, running, completed, failed, recentLogs, modules] =
    await Promise.all([
      prisma.task.count({ where: { workspaceId, status: "QUEUED" } }).catch(() => 0),
      prisma.task.count({ where: { workspaceId, status: "RUNNING" } }).catch(() => 0),
      prisma.task.count({ where: { workspaceId, status: "COMPLETED", updatedAt: { gte: dayAgo } } }).catch(() => 0),
      prisma.task.count({ where: { workspaceId, status: "FAILED", updatedAt: { gte: dayAgo } } }).catch(() => 0),
      prisma.logEvent
        .findMany({
          where: { workspaceId, level: "ERROR", createdAt: { gte: dayAgo } },
          select: { message: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        })
        .catch(() => []),
      prisma.moduleInstallation
        .findMany({
          where: { workspaceId, status: "ACTIVE" },
          select: { moduleType: true },
        })
        .catch(() => []),
    ]);

  const lastTask = await prisma.task
    .findFirst({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    })
    .catch(() => null);

  return {
    workspaceId,
    workspaceName,
    tasksQueued: queued,
    tasksRunning: running,
    tasksCompleted24h: completed,
    tasksFailed24h: failed,
    recentErrors: recentLogs.map((l) => l.message),
    activeModules: modules.map((m) => m.moduleType),
    lastActivityAt: lastTask?.updatedAt?.toISOString() ?? null,
  };
}
