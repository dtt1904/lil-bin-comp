/**
 * LangGraph Salon Sub-graph — per-salon AI agent.
 *
 * Each salon workspace gets its own agent that the salon owner interacts with.
 * The agent is scoped to ONE workspace and CANNOT access other workspaces.
 *
 * Flow: understand_request -> check_permission -> execute_action -> respond
 *
 * Uses OpenAI when OPENAI_API_KEY is set; degrades to keyword-based routing.
 */

import { Annotation, StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PrismaClient } from "../../generated/prisma/client";

// ---------------------------------------------------------------------------
// Salon agent state
// ---------------------------------------------------------------------------

export const SalonAgentState = Annotation.Root({
  workspaceId: Annotation<string>,
  workspaceName: Annotation<string>,
  organizationId: Annotation<string>,

  ownerMessage: Annotation<string>,

  intent: Annotation<SalonIntent>({
    reducer: (_prev, next) => next,
    default: () => "unknown",
  }),

  queryResult: Annotation<unknown>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  actionsTaken: Annotation<SalonAction[]>({
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

export type SalonAgentStateType = typeof SalonAgentState.State;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SalonIntent =
  | "query_revenue"
  | "query_tasks"
  | "query_staff"
  | "query_inventory"
  | "query_reviews"
  | "create_task"
  | "update_schedule"
  | "generate_report"
  | "post_social"
  | "general_question"
  | "escalate"
  | "unknown";

export interface SalonAction {
  type: string;
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
  return new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.2,
    maxTokens: 1024,
    openAIApiKey: key,
  });
}

function getPrismaFromConfig(config?: unknown): PrismaClient | null {
  return (config as { configurable?: { prisma?: PrismaClient } })?.configurable?.prisma ?? null;
}

// ---------------------------------------------------------------------------
// Node: Understand request — classify intent
// ---------------------------------------------------------------------------

async function understandRequest(
  state: SalonAgentStateType
): Promise<Partial<SalonAgentStateType>> {
  const msg = state.ownerMessage;
  console.log(`[salon-agent] Understanding: "${msg.slice(0, 100)}"`);

  const llm = getLLM();
  if (llm) {
    try {
      const response = await llm.invoke([
        new SystemMessage(
          `You classify nail salon owner requests into exactly ONE intent.
Available intents: query_revenue, query_tasks, query_staff, query_inventory, query_reviews, create_task, update_schedule, generate_report, post_social, general_question, escalate.
Use "escalate" only for requests that exceed salon-level authority (firing, legal, multi-location decisions).
Return ONLY the intent string, nothing else.`
        ),
        new HumanMessage(msg),
      ]);
      const raw = (typeof response.content === "string" ? response.content : "").trim().toLowerCase();
      const valid: SalonIntent[] = [
        "query_revenue", "query_tasks", "query_staff", "query_inventory",
        "query_reviews", "create_task", "update_schedule", "generate_report",
        "post_social", "general_question", "escalate",
      ];
      const intent = valid.find((i) => raw.includes(i)) ?? "general_question";
      return { intent };
    } catch (err) {
      console.error("[salon-agent] LLM classify failed:", err);
    }
  }

  return { intent: classifyByKeyword(msg) };
}

function classifyByKeyword(msg: string): SalonIntent {
  const m = msg.toLowerCase();
  if (/revenue|doanh thu|income|money|sales|ti[eề]n/.test(m)) return "query_revenue";
  if (/task|vi[eệ]c|c[oô]ng vi[eệ]c|todo/.test(m)) return "query_tasks";
  if (/staff|th[oợ]|nh[aâ]n vi[eê]n|technician|employee|ca|shift/.test(m)) return "query_staff";
  if (/inventory|h[aà]ng|supply|gel|polish|v[aậ]t t[uư]/.test(m)) return "query_inventory";
  if (/review|đ[aá]nh gi[aá]|google|star|sao/.test(m)) return "query_reviews";
  if (/create|t[aạ]o|add|th[eê]m/.test(m)) return "create_task";
  if (/schedule|l[iị]ch|shift|ca/.test(m)) return "update_schedule";
  if (/report|b[aá]o c[aá]o|summary|t[oổ]ng/.test(m)) return "generate_report";
  if (/post|đ[aă]ng|social|facebook|instagram/.test(m)) return "post_social";
  if (/fire|sa th[aả]i|legal|lu[aậ]t|multi.?location/.test(m)) return "escalate";
  return "general_question";
}

// ---------------------------------------------------------------------------
// Node: Check permission — enforce workspace isolation
// ---------------------------------------------------------------------------

async function checkPermission(
  state: SalonAgentStateType
): Promise<Partial<SalonAgentStateType>> {
  if (state.intent === "escalate") {
    return {
      response: `This request needs to be handled by the supervisor (lil_Bin). I've flagged it for escalation. The admin will review and respond.`,
      actionsTaken: [{
        type: "escalate",
        description: `Escalated: "${state.ownerMessage.slice(0, 100)}"`,
        timestamp: new Date().toISOString(),
      }],
    };
  }
  return {};
}

// ---------------------------------------------------------------------------
// Node: Execute action — query DB or create records
// ---------------------------------------------------------------------------

async function executeAction(
  state: SalonAgentStateType,
  config?: unknown
): Promise<Partial<SalonAgentStateType>> {
  const prisma = getPrismaFromConfig(config);
  if (!prisma) {
    return { error: "No database connection available" };
  }

  const wsId = state.workspaceId;
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    switch (state.intent) {
      case "query_revenue": {
        const [invoices, recentTasks] = await Promise.all([
          prisma.invoiceSnapshot.findMany({
            where: { workspaceId: wsId },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { id: true, customerName: true, amount: true, status: true, createdAt: true },
          }).catch(() => []),
          prisma.task.count({
            where: { workspaceId: wsId, status: "COMPLETED", updatedAt: { gte: dayAgo } },
          }).catch(() => 0),
        ]);
        return {
          queryResult: { invoices, completedToday: recentTasks },
          actionsTaken: [{ type: "query", description: "Queried revenue data", timestamp: now.toISOString() }],
        };
      }

      case "query_tasks": {
        const tasks = await prisma.task.findMany({
          where: { workspaceId: wsId },
          orderBy: { updatedAt: "desc" },
          take: 15,
          select: { id: true, title: true, status: true, priority: true, updatedAt: true },
        }).catch(() => []);
        return {
          queryResult: { tasks, total: tasks.length },
          actionsTaken: [{ type: "query", description: "Queried task list", timestamp: now.toISOString() }],
        };
      }

      case "query_staff": {
        const agents = await prisma.agent.findMany({
          where: { workspaceId: wsId },
          select: { id: true, name: true, role: true, status: true },
        }).catch(() => []);
        const departments = await prisma.department.findMany({
          where: { workspaceId: wsId },
          select: { id: true, name: true, slug: true },
        }).catch(() => []);
        return {
          queryResult: { agents, departments },
          actionsTaken: [{ type: "query", description: "Queried staff/department data", timestamp: now.toISOString() }],
        };
      }

      case "query_inventory": {
        const logs = await prisma.logEvent.findMany({
          where: { workspaceId: wsId, source: { contains: "inventory" } },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { message: true, metadata: true, createdAt: true },
        }).catch(() => []);
        return {
          queryResult: { inventoryLogs: logs },
          actionsTaken: [{ type: "query", description: "Queried inventory logs", timestamp: now.toISOString() }],
        };
      }

      case "query_reviews": {
        const posts = await prisma.publishedPost.findMany({
          where: { workspaceId: wsId },
          orderBy: { publishedAt: "desc" },
          take: 10,
          select: { id: true, platform: true, url: true, metrics: true, publishedAt: true },
        }).catch(() => []);
        const reviewLogs = await prisma.logEvent.findMany({
          where: { workspaceId: wsId, source: { contains: "review" } },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { message: true, createdAt: true },
        }).catch(() => []);
        return {
          queryResult: { posts, reviewLogs },
          actionsTaken: [{ type: "query", description: "Queried reviews/posts", timestamp: now.toISOString() }],
        };
      }

      case "create_task": {
        const task = await prisma.task.create({
          data: {
            title: `Owner request: ${state.ownerMessage.slice(0, 80)}`,
            description: state.ownerMessage,
            status: "QUEUED",
            priority: "MEDIUM",
            executionTarget: "MAC_MINI",
            organizationId: state.organizationId,
            workspaceId: wsId,
            labels: ["salon:owner-request"],
          },
          select: { id: true, title: true },
        });
        return {
          queryResult: { created: task },
          actionsTaken: [{ type: "create_task", description: `Created task: ${task.title}`, timestamp: now.toISOString() }],
        };
      }

      case "generate_report": {
        const [completed, failed, queued, running, recentLogs] = await Promise.all([
          prisma.task.count({ where: { workspaceId: wsId, status: "COMPLETED", updatedAt: { gte: weekAgo } } }).catch(() => 0),
          prisma.task.count({ where: { workspaceId: wsId, status: "FAILED", updatedAt: { gte: weekAgo } } }).catch(() => 0),
          prisma.task.count({ where: { workspaceId: wsId, status: "QUEUED" } }).catch(() => 0),
          prisma.task.count({ where: { workspaceId: wsId, status: "RUNNING" } }).catch(() => 0),
          prisma.logEvent.findMany({
            where: { workspaceId: wsId, createdAt: { gte: weekAgo } },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { level: true, message: true, source: true, createdAt: true },
          }).catch(() => []),
        ]);
        return {
          queryResult: { completed, failed, queued, running, recentLogs },
          actionsTaken: [{ type: "report", description: "Generated workspace report", timestamp: now.toISOString() }],
        };
      }

      case "post_social": {
        const task = await prisma.task.create({
          data: {
            title: `Social post request: ${state.ownerMessage.slice(0, 60)}`,
            description: state.ownerMessage,
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
          queryResult: { socialTaskCreated: task.id },
          actionsTaken: [{ type: "create_task", description: "Queued social media content task", timestamp: now.toISOString() }],
        };
      }

      case "update_schedule":
      case "general_question":
      default: {
        const context = await prisma.task.findMany({
          where: { workspaceId: wsId },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { title: true, status: true },
        }).catch(() => []);
        return {
          queryResult: { recentTasks: context },
          actionsTaken: [{ type: "context_fetch", description: "Fetched workspace context", timestamp: now.toISOString() }],
        };
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[salon-agent] Execute error:`, msg);
    return { error: msg };
  }
}

// ---------------------------------------------------------------------------
// Node: Respond — generate natural language response
// ---------------------------------------------------------------------------

async function respondNode(
  state: SalonAgentStateType
): Promise<Partial<SalonAgentStateType>> {
  if (state.response) return {};

  if (state.error) {
    return { response: `Sorry, I encountered an issue: ${state.error}. Please try again or contact the admin.` };
  }

  const llm = getLLM();
  if (llm) {
    try {
      const res = await llm.invoke([
        new SystemMessage(
          `You are the AI manager for "${state.workspaceName}" nail salon. Respond to the salon owner's question using the data provided. Be concise, professional, and helpful. Use Vietnamese if the owner wrote in Vietnamese. Never reveal data from other salons.`
        ),
        new HumanMessage(
          `Owner's message: "${state.ownerMessage}"\n\nIntent: ${state.intent}\n\nData:\n${JSON.stringify(state.queryResult, null, 2)}\n\nActions taken: ${state.actionsTaken.map((a) => a.description).join(", ")}`
        ),
      ]);
      const content = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
      return { response: content };
    } catch (err) {
      console.error("[salon-agent] LLM response failed:", err);
    }
  }

  const data = state.queryResult;
  const parts: string[] = [`[${state.workspaceName}] Request processed.`];
  parts.push(`Intent: ${state.intent}`);
  if (data) parts.push(`Data: ${JSON.stringify(data).slice(0, 500)}`);
  if (state.actionsTaken.length > 0) {
    parts.push(`Actions: ${state.actionsTaken.map((a) => a.description).join("; ")}`);
  }
  return { response: parts.join("\n") };
}

// ---------------------------------------------------------------------------
// Graph construction
// ---------------------------------------------------------------------------

function afterPermissionCheck(state: SalonAgentStateType): string {
  if (state.intent === "escalate") return "respond";
  return "execute";
}

export function buildSalonGraph() {
  const graph = new StateGraph(SalonAgentState)
    .addNode("understand", understandRequest)
    .addNode("permission", checkPermission)
    .addNode("execute", executeAction)
    .addNode("respond", respondNode)
    .addEdge("__start__", "understand")
    .addEdge("understand", "permission")
    .addConditionalEdges("permission", afterPermissionCheck)
    .addEdge("execute", "respond")
    .addEdge("respond", END);

  return graph.compile();
}

// ---------------------------------------------------------------------------
// Convenience runner
// ---------------------------------------------------------------------------

export async function runSalonAgent(
  prisma: PrismaClient,
  input: {
    workspaceId: string;
    workspaceName: string;
    organizationId: string;
    ownerMessage: string;
  }
): Promise<SalonAgentStateType> {
  const graph = buildSalonGraph();

  const result = await graph.invoke(
    {
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName,
      organizationId: input.organizationId,
      ownerMessage: input.ownerMessage,
    },
    { configurable: { prisma } }
  );

  return result as SalonAgentStateType;
}
