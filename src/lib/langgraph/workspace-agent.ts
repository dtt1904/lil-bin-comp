/**
 * LangGraph Workspace Agent — universal per-workspace AI agent.
 *
 * Works for ANY industry (nail salon, fanpage, trucking, roofing, etc.)
 * by reading workspace context (departments, modules, agents) from the DB.
 *
 * Flow: understand -> route_department -> execute -> respond
 *
 * Each workspace has a "manager agent" that can delegate to department-level
 * agents for specialized work.
 */

import { Annotation, StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PrismaClient } from "../../generated/prisma/client";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const WorkspaceAgentState = Annotation.Root({
  workspaceId: Annotation<string>,
  workspaceName: Annotation<string>,
  organizationId: Annotation<string>,

  message: Annotation<string>,
  role: Annotation<"ceo" | "owner" | "manager">({
    reducer: (_prev, next) => next,
    default: () => "owner",
  }),

  workspaceContext: Annotation<WorkspaceContext | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  intent: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "general",
  }),

  targetDepartment: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  queryResult: Annotation<unknown>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  actions: Annotation<AgentAction[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
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

export type WorkspaceAgentStateType = typeof WorkspaceAgentState.State;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkspaceContext {
  departments: Array<{ id: string; name: string; slug: string }>;
  agents: Array<{ id: string; name: string; role: string; departmentSlug?: string }>;
  activeModules: string[];
  taskCounts: { queued: number; running: number; completed: number; failed: number };
  recentActivity: string[];
}

export interface AgentAction {
  type: string;
  department?: string;
  description: string;
  result?: unknown;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// LLM
// ---------------------------------------------------------------------------

function getLLM(): ChatOpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new ChatOpenAI({ modelName: "gpt-4o", temperature: 0.2, maxTokens: 1536, openAIApiKey: key });
}

function getPrismaFromConfig(config?: unknown): PrismaClient | null {
  return (config as { configurable?: { prisma?: PrismaClient } })?.configurable?.prisma ?? null;
}

// ---------------------------------------------------------------------------
// Node 1: Load workspace context
// ---------------------------------------------------------------------------

async function loadContext(
  state: WorkspaceAgentStateType,
  config?: unknown
): Promise<Partial<WorkspaceAgentStateType>> {
  const prisma = getPrismaFromConfig(config);
  if (!prisma) return { error: "No database connection" };

  const wsId = state.workspaceId;
  const dayAgo = new Date(Date.now() - 86400000);

  try {
    const [departments, agents, modules, queued, running, completed, failed, logs] = await Promise.all([
      prisma.department.findMany({ where: { workspaceId: wsId }, select: { id: true, name: true, slug: true } }).catch(() => []),
      prisma.agent.findMany({ where: { workspaceId: wsId }, select: { id: true, name: true, role: true, department: { select: { slug: true } } } }).catch(() => []),
      prisma.moduleInstallation.findMany({ where: { workspaceId: wsId, status: "ACTIVE" }, select: { moduleType: true } }).catch(() => []),
      prisma.task.count({ where: { workspaceId: wsId, status: "QUEUED" } }).catch(() => 0),
      prisma.task.count({ where: { workspaceId: wsId, status: "RUNNING" } }).catch(() => 0),
      prisma.task.count({ where: { workspaceId: wsId, status: "COMPLETED", updatedAt: { gte: dayAgo } } }).catch(() => 0),
      prisma.task.count({ where: { workspaceId: wsId, status: "FAILED", updatedAt: { gte: dayAgo } } }).catch(() => 0),
      prisma.logEvent.findMany({ where: { workspaceId: wsId, createdAt: { gte: dayAgo } }, orderBy: { createdAt: "desc" }, take: 5, select: { message: true } }).catch(() => []),
    ]);

    const ctx: WorkspaceContext = {
      departments,
      agents: agents.map((a) => ({ id: a.id, name: a.name, role: a.role, departmentSlug: a.department?.slug })),
      activeModules: modules.map((m) => m.moduleType),
      taskCounts: { queued, running, completed, failed },
      recentActivity: logs.map((l) => l.message),
    };

    return { workspaceContext: ctx };
  } catch (err) {
    return { error: `Failed to load context: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// Node 2: Understand intent and route to department
// ---------------------------------------------------------------------------

async function understand(
  state: WorkspaceAgentStateType
): Promise<Partial<WorkspaceAgentStateType>> {
  const ctx = state.workspaceContext;
  const deptList = ctx?.departments.map((d) => d.slug).join(", ") || "none";
  const moduleList = ctx?.activeModules.join(", ") || "none";

  const llm = getLLM();
  if (llm) {
    try {
      const res = await llm.invoke([
        new SystemMessage(
          `You route messages for workspace "${state.workspaceName}".
Departments: ${deptList}
Modules: ${moduleList}
Classify the message into:
1. intent: one of [query_status, query_tasks, query_revenue, create_task, assign_task, generate_report, post_content, manage_staff, escalate, general]
2. department: the most relevant department slug, or null if workspace-wide
Return JSON only: {"intent": "...", "department": "..." or null}`
        ),
        new HumanMessage(state.message),
      ]);
      const raw = typeof res.content === "string" ? res.content : "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          intent: String(parsed.intent ?? "general"),
          targetDepartment: parsed.department ? String(parsed.department) : null,
        };
      }
    } catch (err) {
      console.error("[workspace-agent] LLM classify failed:", err);
    }
  }

  return classifyByKeywords(state.message, ctx);
}

function classifyByKeywords(msg: string, ctx: WorkspaceContext | null): Partial<WorkspaceAgentStateType> {
  const m = msg.toLowerCase();
  let intent = "general";
  let dept: string | null = null;

  if (/status|health|overview|tình trạng|tổng quan/.test(m)) intent = "query_status";
  else if (/task|việc|công việc|todo|backlog/.test(m)) intent = "query_tasks";
  else if (/revenue|doanh thu|tiền|income|money|sales|invoice/.test(m)) intent = "query_revenue";
  else if (/create|tạo|add|thêm|mới/.test(m)) intent = "create_task";
  else if (/assign|giao|phân/.test(m)) intent = "assign_task";
  else if (/report|báo cáo|summary|tổng kết/.test(m)) intent = "generate_report";
  else if (/post|đăng|content|social|facebook|instagram/.test(m)) intent = "post_content";
  else if (/staff|nhân viên|thợ|employee|ca|shift|schedule/.test(m)) intent = "manage_staff";
  else if (/escalate|cấp trên|lil.?bin/.test(m)) intent = "escalate";

  if (ctx) {
    for (const d of ctx.departments) {
      if (m.includes(d.slug) || m.includes(d.name.toLowerCase())) {
        dept = d.slug;
        break;
      }
    }
  }

  return { intent, targetDepartment: dept };
}

// ---------------------------------------------------------------------------
// Node 3: Execute — department-aware action
// ---------------------------------------------------------------------------

async function execute(
  state: WorkspaceAgentStateType,
  config?: unknown
): Promise<Partial<WorkspaceAgentStateType>> {
  const prisma = getPrismaFromConfig(config);
  if (!prisma) return { error: "No database connection" };
  if (state.intent === "escalate") {
    return {
      actions: [{
        type: "escalate",
        description: `Escalated to lil_Bin supervisor: "${state.message.slice(0, 100)}"`,
        timestamp: new Date().toISOString(),
      }],
    };
  }

  const wsId = state.workspaceId;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const deptFilter = state.targetDepartment
    ? { department: { slug: state.targetDepartment } }
    : {};

  try {
    switch (state.intent) {
      case "query_status": {
        const ctx = state.workspaceContext;
        return {
          queryResult: {
            workspace: state.workspaceName,
            departments: ctx?.departments.length ?? 0,
            agents: ctx?.agents.length ?? 0,
            modules: ctx?.activeModules ?? [],
            tasks: ctx?.taskCounts ?? {},
            recentActivity: ctx?.recentActivity.slice(0, 3) ?? [],
          },
          actions: [{ type: "query", department: state.targetDepartment ?? undefined, description: "Queried workspace status", timestamp: now.toISOString() }],
        };
      }

      case "query_tasks": {
        const tasks = await prisma.task.findMany({
          where: { workspaceId: wsId, ...deptFilter },
          orderBy: { updatedAt: "desc" },
          take: 15,
          select: { id: true, title: true, status: true, priority: true, labels: true, department: { select: { name: true } }, updatedAt: true },
        }).catch(() => []);
        return {
          queryResult: { tasks, department: state.targetDepartment },
          actions: [{ type: "query", department: state.targetDepartment ?? undefined, description: `Queried tasks${state.targetDepartment ? ` for ${state.targetDepartment}` : ""}`, timestamp: now.toISOString() }],
        };
      }

      case "query_revenue": {
        const invoices = await prisma.invoiceSnapshot.findMany({
          where: { workspaceId: wsId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, customerName: true, amount: true, status: true, createdAt: true },
        }).catch(() => []);
        const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount ?? 0), 0);
        return {
          queryResult: { invoices, totalAmount, count: invoices.length },
          actions: [{ type: "query", description: "Queried revenue/invoices", timestamp: now.toISOString() }],
        };
      }

      case "create_task": {
        const deptId = state.targetDepartment
          ? (await prisma.department.findFirst({ where: { workspaceId: wsId, slug: state.targetDepartment }, select: { id: true } }).catch(() => null))?.id
          : undefined;
        const task = await prisma.task.create({
          data: {
            title: state.message.slice(0, 100),
            description: state.message,
            status: "QUEUED",
            priority: "MEDIUM",
            executionTarget: "MAC_MINI",
            organizationId: state.organizationId,
            workspaceId: wsId,
            departmentId: deptId,
            labels: ["workspace-agent:created"],
          },
          select: { id: true, title: true },
        });
        return {
          queryResult: { created: task },
          actions: [{ type: "create_task", department: state.targetDepartment ?? undefined, description: `Created task: ${task.title}`, timestamp: now.toISOString() }],
        };
      }

      case "generate_report": {
        const [completed, failed, queued, posts, logs] = await Promise.all([
          prisma.task.count({ where: { workspaceId: wsId, status: "COMPLETED", updatedAt: { gte: weekAgo } } }).catch(() => 0),
          prisma.task.count({ where: { workspaceId: wsId, status: "FAILED", updatedAt: { gte: weekAgo } } }).catch(() => 0),
          prisma.task.count({ where: { workspaceId: wsId, status: "QUEUED" } }).catch(() => 0),
          prisma.publishedPost.count({ where: { workspaceId: wsId, publishedAt: { gte: weekAgo } } }).catch(() => 0),
          prisma.logEvent.findMany({ where: { workspaceId: wsId, level: "ERROR", createdAt: { gte: weekAgo } }, take: 5, select: { message: true } }).catch(() => []),
        ]);
        return {
          queryResult: { period: "7 days", completed, failed, queued, publishedPosts: posts, errors: logs.map((l) => l.message) },
          actions: [{ type: "report", description: "Generated weekly report", timestamp: now.toISOString() }],
        };
      }

      case "post_content": {
        const task = await prisma.task.create({
          data: {
            title: `Content request: ${state.message.slice(0, 60)}`,
            description: state.message,
            status: "QUEUED",
            priority: "MEDIUM",
            executionTarget: "MAC_MINI",
            organizationId: state.organizationId,
            workspaceId: wsId,
            labels: ["fanpage:discover"],
          },
          select: { id: true },
        });
        return {
          queryResult: { contentTaskId: task.id },
          actions: [{ type: "create_task", department: "marketing", description: "Queued content/social media task", timestamp: now.toISOString() }],
        };
      }

      case "manage_staff": {
        const agents = await prisma.agent.findMany({
          where: { workspaceId: wsId },
          select: { id: true, name: true, role: true, status: true, department: { select: { name: true, slug: true } } },
        }).catch(() => []);
        return {
          queryResult: { staff: agents },
          actions: [{ type: "query", description: "Queried staff/agents", timestamp: now.toISOString() }],
        };
      }

      default: {
        const recent = await prisma.task.findMany({
          where: { workspaceId: wsId },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { title: true, status: true },
        }).catch(() => []);
        return {
          queryResult: { recentTasks: recent },
          actions: [{ type: "context", description: "Fetched general context", timestamp: now.toISOString() }],
        };
      }
    }
  } catch (err) {
    return { error: `Execute failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// Node 4: Respond
// ---------------------------------------------------------------------------

async function respond(
  state: WorkspaceAgentStateType
): Promise<Partial<WorkspaceAgentStateType>> {
  if (state.response && state.intent === "escalate") return {};
  if (state.intent === "escalate") {
    return { response: `I've escalated this to lil_Bin (the supervisor). The CEO will be notified. Your request: "${state.message.slice(0, 100)}"` };
  }
  if (state.error) {
    return { response: `I ran into an issue: ${state.error}. Please try again or contact the admin.` };
  }

  const llm = getLLM();
  if (llm) {
    try {
      const deptInfo = state.targetDepartment ? `\nRouted to department: ${state.targetDepartment}` : "";
      const roleContext = state.role === "ceo"
        ? `You are lil_Bin, the AI Chief of Staff. You're reporting to the CEO (Trung). Be executive-level, concise, and actionable.`
        : `You are the AI manager for "${state.workspaceName}". Report to the workspace owner. Be professional and helpful.`;

      const res = await llm.invoke([
        new SystemMessage(`${roleContext} Use Vietnamese if the user wrote in Vietnamese. Never reveal data from other workspaces.`),
        new HumanMessage(
          `User message: "${state.message}"\nIntent: ${state.intent}${deptInfo}\nData:\n${JSON.stringify(state.queryResult, null, 2)}\nActions: ${state.actions.map((a) => a.description).join(", ")}`
        ),
      ]);
      return { response: typeof res.content === "string" ? res.content : JSON.stringify(res.content) };
    } catch (err) {
      console.error("[workspace-agent] LLM respond failed:", err);
    }
  }

  const parts = [`[${state.workspaceName}] ${state.intent}`];
  if (state.targetDepartment) parts.push(`Department: ${state.targetDepartment}`);
  if (state.queryResult) parts.push(JSON.stringify(state.queryResult).slice(0, 600));
  if (state.actions.length) parts.push(`Actions: ${state.actions.map((a) => a.description).join("; ")}`);
  return { response: parts.join("\n") };
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

function afterUnderstand(state: WorkspaceAgentStateType): string {
  if (state.error) return "respond";
  return "execute";
}

export function buildWorkspaceAgentGraph() {
  const graph = new StateGraph(WorkspaceAgentState)
    .addNode("loadContext", loadContext)
    .addNode("understand", understand)
    .addNode("execute", execute)
    .addNode("respond", respond)
    .addEdge("__start__", "loadContext")
    .addEdge("loadContext", "understand")
    .addConditionalEdges("understand", afterUnderstand)
    .addEdge("execute", "respond")
    .addEdge("respond", END);

  return graph.compile();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runWorkspaceAgent(
  prisma: PrismaClient,
  input: {
    workspaceId: string;
    workspaceName: string;
    organizationId: string;
    message: string;
    role?: "ceo" | "owner" | "manager";
  }
): Promise<WorkspaceAgentStateType> {
  const graph = buildWorkspaceAgentGraph();
  const result = await graph.invoke(
    {
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName,
      organizationId: input.organizationId,
      message: input.message,
      role: input.role ?? "owner",
    },
    { configurable: { prisma } }
  );
  return result as WorkspaceAgentStateType;
}
