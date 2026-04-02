/**
 * lil_Bin Supervisor Chat — the CEO-level conversational interface.
 *
 * When the CEO (Trung) sends a message to lil_Bin, this graph:
 * 1. Loads all workspaces and their status
 * 2. Understands whether the message is about a specific workspace or cross-workspace
 * 3. If workspace-specific: delegates to the workspace sub-agent
 * 4. If cross-workspace: handles directly (overview, compare, report)
 * 5. Returns a response with full delegation chain visibility
 */

import { Annotation, StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PrismaClient } from "../../generated/prisma/client";
import { runWorkspaceAgent, type WorkspaceAgentStateType } from "./workspace-agent";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const SupervisorChatState = Annotation.Root({
  organizationId: Annotation<string>,
  message: Annotation<string>,

  allWorkspaces: Annotation<WorkspaceSummary[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  intent: Annotation<SupervisorChatIntent>({
    reducer: (_prev, next) => next,
    default: () => "overview",
  }),

  targetWorkspaceId: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  delegationResults: Annotation<DelegationResult[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  queryResult: Annotation<unknown>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  response: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),

  error: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
});

export type SupervisorChatStateType = typeof SupervisorChatState.State;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  type: string;
  departments: number;
  agents: number;
  tasksPending: number;
  tasksCompleted24h: number;
  tasksFailed24h: number;
}

type SupervisorChatIntent =
  | "overview"
  | "workspace_detail"
  | "delegate_to_workspace"
  | "cross_workspace_compare"
  | "create_task"
  | "generate_report"
  | "system_health"
  | "general";

interface DelegationResult {
  workspaceId: string;
  workspaceName: string;
  agentResponse: string;
  intent: string;
  department?: string;
  actions: Array<{ type: string; description: string }>;
}

// ---------------------------------------------------------------------------
// LLM
// ---------------------------------------------------------------------------

function getLLM(): ChatOpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new ChatOpenAI({ modelName: "gpt-4o", temperature: 0.3, maxTokens: 2048, openAIApiKey: key });
}

// ---------------------------------------------------------------------------
// Node 1: Load all workspaces
// ---------------------------------------------------------------------------

async function loadWorkspaces(
  state: SupervisorChatStateType,
  config?: { prisma?: PrismaClient }
): Promise<Partial<SupervisorChatStateType>> {
  const prisma = config?.prisma;
  if (!prisma) return { error: "No database connection" };

  const dayAgo = new Date(Date.now() - 86400000);

  try {
    const workspaces = await prisma.workspace.findMany({
      where: { organizationId: state.organizationId },
      select: {
        id: true, name: true, slug: true, type: true,
        _count: { select: { departments: true, agents: true } },
      },
    });

    const summaries: WorkspaceSummary[] = [];
    for (const ws of workspaces) {
      const [pending, completed, failed] = await Promise.all([
        prisma.task.count({ where: { workspaceId: ws.id, status: { in: ["QUEUED", "RUNNING"] } } }).catch(() => 0),
        prisma.task.count({ where: { workspaceId: ws.id, status: "COMPLETED", updatedAt: { gte: dayAgo } } }).catch(() => 0),
        prisma.task.count({ where: { workspaceId: ws.id, status: "FAILED", updatedAt: { gte: dayAgo } } }).catch(() => 0),
      ]);
      summaries.push({
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        type: ws.type,
        departments: ws._count.departments,
        agents: ws._count.agents,
        tasksPending: pending,
        tasksCompleted24h: completed,
        tasksFailed24h: failed,
      });
    }

    return { allWorkspaces: summaries };
  } catch (err) {
    return { error: `Failed to load workspaces: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// Node 2: Classify intent and identify target workspace
// ---------------------------------------------------------------------------

async function classify(
  state: SupervisorChatStateType
): Promise<Partial<SupervisorChatStateType>> {
  const wsList = state.allWorkspaces.map((w) => `${w.slug} (${w.name})`).join(", ");

  const llm = getLLM();
  if (llm) {
    try {
      const res = await llm.invoke([
        new SystemMessage(
          `You are lil_Bin, AI Chief of Staff. You route the CEO's messages.
Active workspaces: ${wsList}

Classify:
1. intent: one of [overview, workspace_detail, delegate_to_workspace, cross_workspace_compare, create_task, generate_report, system_health, general]
2. targetWorkspace: the workspace slug if message is about one specific workspace, or null if cross-workspace/general.

Rules:
- "overview" = CEO wants a high-level summary of all operations
- "workspace_detail" = CEO wants detail about ONE specific workspace
- "delegate_to_workspace" = CEO gives an instruction FOR a specific workspace (the workspace agent should handle it)
- "cross_workspace_compare" = CEO wants to compare multiple workspaces
- "create_task" = CEO wants to create a task (may be for a specific workspace)
- "generate_report" = CEO wants a comprehensive report
- "system_health" = CEO asks about system/runner/infrastructure health
- "general" = general question or greeting

Return JSON only: {"intent": "...", "targetWorkspace": "slug" or null}`
        ),
        new HumanMessage(state.message),
      ]);
      const raw = typeof res.content === "string" ? res.content : "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const intent = String(parsed.intent ?? "general") as SupervisorChatIntent;
        const slug = parsed.targetWorkspace ? String(parsed.targetWorkspace) : null;
        const ws = slug ? state.allWorkspaces.find((w) => w.slug === slug || w.name.toLowerCase().includes(slug.toLowerCase())) : null;
        return { intent, targetWorkspaceId: ws?.id ?? null };
      }
    } catch (err) {
      console.error("[supervisor-chat] LLM classify failed:", err);
    }
  }

  return classifyByKeywords(state);
}

function classifyByKeywords(state: SupervisorChatStateType): Partial<SupervisorChatStateType> {
  const m = state.message.toLowerCase();
  let intent: SupervisorChatIntent = "general";
  let targetWs: string | null = null;

  if (/overview|tổng quan|all workspace|toàn bộ|tất cả/.test(m)) intent = "overview";
  else if (/compare|so sánh/.test(m)) intent = "cross_workspace_compare";
  else if (/report|báo cáo|summary/.test(m)) intent = "generate_report";
  else if (/health|hệ thống|system|runner/.test(m)) intent = "system_health";
  else if (/create|tạo|add|thêm/.test(m)) intent = "create_task";

  for (const ws of state.allWorkspaces) {
    if (m.includes(ws.slug.toLowerCase()) || m.includes(ws.name.toLowerCase())) {
      targetWs = ws.id;
      if (intent === "general") intent = "delegate_to_workspace";
      break;
    }
  }

  return { intent, targetWorkspaceId: targetWs };
}

// ---------------------------------------------------------------------------
// Node 3: Execute — delegate or handle directly
// ---------------------------------------------------------------------------

async function execute(
  state: SupervisorChatStateType,
  config?: { prisma?: PrismaClient }
): Promise<Partial<SupervisorChatStateType>> {
  const prisma = config?.prisma;
  if (!prisma) return { error: "No database connection" };

  try {
    switch (state.intent) {
      case "overview": {
        return {
          queryResult: {
            totalWorkspaces: state.allWorkspaces.length,
            workspaces: state.allWorkspaces.map((w) => ({
              name: w.name,
              type: w.type,
              departments: w.departments,
              agents: w.agents,
              pending: w.tasksPending,
              completed24h: w.tasksCompleted24h,
              failed24h: w.tasksFailed24h,
            })),
          },
        };
      }

      case "cross_workspace_compare": {
        return {
          queryResult: {
            comparison: state.allWorkspaces.map((w) => ({
              name: w.name,
              departments: w.departments,
              agents: w.agents,
              pending: w.tasksPending,
              completed24h: w.tasksCompleted24h,
              failed24h: w.tasksFailed24h,
              healthScore: w.tasksFailed24h === 0 ? "healthy" : w.tasksFailed24h > 3 ? "critical" : "warning",
            })),
          },
        };
      }

      case "system_health": {
        const [totalTasks, runningTasks, failedTasks, recentLogs] = await Promise.all([
          prisma.task.count({ where: { organizationId: state.organizationId } }).catch(() => 0),
          prisma.task.count({ where: { organizationId: state.organizationId, status: "RUNNING" } }).catch(() => 0),
          prisma.task.count({ where: { organizationId: state.organizationId, status: "FAILED" } }).catch(() => 0),
          prisma.logEvent.findMany({
            where: { organizationId: state.organizationId, level: "ERROR" },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { message: true, source: true, createdAt: true },
          }).catch(() => []),
        ]);
        return {
          queryResult: { totalTasks, runningTasks, failedTasks, recentErrors: recentLogs, workspaces: state.allWorkspaces.length },
        };
      }

      case "generate_report": {
        const dayAgo = new Date(Date.now() - 86400000);
        const weekAgo = new Date(Date.now() - 7 * 86400000);
        const wsReports = [];
        for (const ws of state.allWorkspaces) {
          const [completedWeek, failedWeek, posts] = await Promise.all([
            prisma.task.count({ where: { workspaceId: ws.id, status: "COMPLETED", updatedAt: { gte: weekAgo } } }).catch(() => 0),
            prisma.task.count({ where: { workspaceId: ws.id, status: "FAILED", updatedAt: { gte: weekAgo } } }).catch(() => 0),
            prisma.publishedPost.count({ where: { workspaceId: ws.id, publishedAt: { gte: weekAgo } } }).catch(() => 0),
          ]);
          wsReports.push({ name: ws.name, completedWeek, failedWeek, publishedPosts: posts });
        }
        return { queryResult: { period: "7 days", workspaceReports: wsReports } };
      }

      case "workspace_detail":
      case "delegate_to_workspace": {
        if (!state.targetWorkspaceId) {
          return { queryResult: { error: "No specific workspace identified. Available: " + state.allWorkspaces.map((w) => w.name).join(", ") } };
        }

        const ws = state.allWorkspaces.find((w) => w.id === state.targetWorkspaceId);
        if (!ws) return { queryResult: { error: "Workspace not found" } };

        const agentResult = await runWorkspaceAgent(prisma, {
          workspaceId: ws.id,
          workspaceName: ws.name,
          organizationId: state.organizationId,
          message: state.message,
          role: "ceo",
        });

        return {
          delegationResults: [{
            workspaceId: ws.id,
            workspaceName: ws.name,
            agentResponse: agentResult.response,
            intent: agentResult.intent,
            department: agentResult.targetDepartment ?? undefined,
            actions: agentResult.actions.map((a) => ({ type: a.type, description: a.description })),
          }],
          queryResult: {
            delegated: true,
            workspace: ws.name,
            subAgentIntent: agentResult.intent,
            subAgentDepartment: agentResult.targetDepartment,
          },
        };
      }

      case "create_task": {
        const wsId = state.targetWorkspaceId ?? state.allWorkspaces[0]?.id;
        if (!wsId) return { error: "No workspace available for task creation" };
        const ws = state.allWorkspaces.find((w) => w.id === wsId);

        const agentResult = await runWorkspaceAgent(prisma, {
          workspaceId: wsId,
          workspaceName: ws?.name ?? "Unknown",
          organizationId: state.organizationId,
          message: state.message,
          role: "ceo",
        });

        return {
          delegationResults: [{
            workspaceId: wsId,
            workspaceName: ws?.name ?? "Unknown",
            agentResponse: agentResult.response,
            intent: agentResult.intent,
            department: agentResult.targetDepartment ?? undefined,
            actions: agentResult.actions.map((a) => ({ type: a.type, description: a.description })),
          }],
        };
      }

      default:
        return {};
    }
  } catch (err) {
    return { error: `Execute failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// Node 4: Respond
// ---------------------------------------------------------------------------

async function respond(
  state: SupervisorChatStateType
): Promise<Partial<SupervisorChatStateType>> {
  if (state.error) {
    return { response: `Xin lỗi CEO, tôi gặp sự cố: ${state.error}` };
  }

  const llm = getLLM();
  if (llm) {
    try {
      const delegationInfo = state.delegationResults.length > 0
        ? `\n\nDelegation chain:\n${state.delegationResults.map((d) =>
          `→ Workspace "${d.workspaceName}" agent handled (intent: ${d.intent}${d.department ? `, dept: ${d.department}` : ""})\n  Actions: ${d.actions.map((a) => a.description).join("; ")}\n  Response: ${d.agentResponse.slice(0, 300)}`
        ).join("\n")}`
        : "";

      const res = await llm.invoke([
        new SystemMessage(
          `You are lil_Bin, AI Chief of Staff for Trung's company. You manage ALL business workspaces.
Your style: executive-level, concise, actionable. Show the delegation chain when you delegate to workspace agents.
Use Vietnamese if the CEO writes in Vietnamese.
When reporting, always mention which workspace agent handled what, and which department was involved.
Format responses with clear sections and bullet points.`
        ),
        new HumanMessage(
          `CEO's message: "${state.message}"
Intent: ${state.intent}
Workspaces: ${state.allWorkspaces.length} active
Data: ${JSON.stringify(state.queryResult, null, 2)}${delegationInfo}`
        ),
      ]);
      return { response: typeof res.content === "string" ? res.content : JSON.stringify(res.content) };
    } catch (err) {
      console.error("[supervisor-chat] LLM respond failed:", err);
    }
  }

  const parts: string[] = [`🏢 lil_Bin — ${state.intent}`];

  if (state.allWorkspaces.length > 0) {
    parts.push(`\nWorkspaces (${state.allWorkspaces.length}):`);
    for (const ws of state.allWorkspaces) {
      parts.push(`  • ${ws.name} — ${ws.departments} depts, ${ws.agents} agents, ${ws.tasksPending} pending, ${ws.tasksCompleted24h} done/24h${ws.tasksFailed24h > 0 ? `, ⚠️ ${ws.tasksFailed24h} failed` : ""}`);
    }
  }

  if (state.delegationResults.length > 0) {
    parts.push(`\nDelegation:`);
    for (const d of state.delegationResults) {
      parts.push(`  → ${d.workspaceName} (${d.intent}${d.department ? ` → ${d.department}` : ""})`);
      parts.push(`    ${d.agentResponse.slice(0, 200)}`);
    }
  }

  if (state.queryResult) {
    parts.push(`\nData: ${JSON.stringify(state.queryResult).slice(0, 500)}`);
  }

  return { response: parts.join("\n") };
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

function afterClassify(state: SupervisorChatStateType): string {
  if (state.error) return "respond";
  return "execute";
}

export function buildSupervisorChatGraph() {
  const graph = new StateGraph(SupervisorChatState)
    .addNode("loadWorkspaces", loadWorkspaces as any)
    .addNode("classify", classify as any)
    .addNode("execute", execute as any)
    .addNode("respond", respond as any)
    .addEdge("__start__", "loadWorkspaces")
    .addEdge("loadWorkspaces", "classify")
    .addConditionalEdges("classify", afterClassify)
    .addEdge("execute", "respond")
    .addEdge("respond", END);

  return graph.compile();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function chatWithSupervisor(
  prisma: PrismaClient,
  input: {
    organizationId: string;
    message: string;
  }
): Promise<SupervisorChatStateType> {
  const graph = buildSupervisorChatGraph();
  const result = await graph.invoke(
    {
      organizationId: input.organizationId,
      message: input.message,
    },
    { configurable: { prisma } }
  );
  return result as SupervisorChatStateType;
}
