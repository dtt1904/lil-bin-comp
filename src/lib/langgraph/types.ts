/**
 * LangGraph state & type definitions for the lil_Bin supervisor system.
 *
 * The supervisor orchestrates workspace operations by planning tasks,
 * monitoring progress, classifying failures, and reporting outcomes.
 */

import { Annotation } from "@langchain/langgraph";

// ---------------------------------------------------------------------------
// Supervisor graph state
// ---------------------------------------------------------------------------

export const SupervisorState = Annotation.Root({
  workspaceId: Annotation<string>,
  workspaceName: Annotation<string>,
  organizationId: Annotation<string>,

  objective: Annotation<string>,
  mode: Annotation<"plan" | "monitor" | "report">({
    reducer: (_prev, next) => next,
    default: () => "plan",
  }),

  plan: Annotation<PlannedTask[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  taskResults: Annotation<TaskResult[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  decisions: Annotation<SupervisorDecision[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  summary: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),

  error: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
});

export type SupervisorStateType = typeof SupervisorState.State;

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

export interface PlannedTask {
  title: string;
  description: string;
  label: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  departmentSlug?: string;
  requiresApproval: boolean;
}

export interface TaskResult {
  taskId: string;
  title: string;
  status: "COMPLETED" | "FAILED" | "RUNNING" | "QUEUED";
  output?: unknown;
  error?: string;
  durationMs?: number;
}

export type DecisionAction =
  | "create_task"
  | "retry_task"
  | "escalate"
  | "skip"
  | "report"
  | "approve_auto"
  | "request_review";

export interface SupervisorDecision {
  action: DecisionAction;
  reason: string;
  taskLabel?: string;
  taskTitle?: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

export type FailureCategory =
  | "token_expired"
  | "rate_limit"
  | "content_policy"
  | "network"
  | "schema_drift"
  | "missing_config"
  | "unknown";

export interface ClassifiedFailure {
  category: FailureCategory;
  action: "retry" | "backoff" | "escalate" | "reauth" | "review";
  message: string;
  retryDelayMs?: number;
}

// ---------------------------------------------------------------------------
// Workspace health snapshot
// ---------------------------------------------------------------------------

export interface WorkspaceHealth {
  workspaceId: string;
  workspaceName: string;
  tasksQueued: number;
  tasksRunning: number;
  tasksCompleted24h: number;
  tasksFailed24h: number;
  recentErrors: string[];
  activeModules: string[];
  lastActivityAt: string | null;
}
