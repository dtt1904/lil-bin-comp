/**
 * Governance policies for the supervisor.
 *
 * Defines what actions are auto-approved vs require human review,
 * failure classification rules, and risk levels per task type.
 */

import type { ClassifiedFailure, FailureCategory } from "./types";

// ---------------------------------------------------------------------------
// Risk levels per task label
// ---------------------------------------------------------------------------

type RiskLevel = "low" | "medium" | "high";

const TASK_RISK: Record<string, RiskLevel> = {
  "fanpage:discover": "low",
  "fanpage:draft": "low",
  "fanpage:post": "high",
  "fanpage:engage": "medium",
  "health-check": "low",
  "supervisor:plan": "low",
  "supervisor:monitor": "low",
  "supervisor:report": "low",
};

export function getTaskRisk(label: string): RiskLevel {
  return TASK_RISK[label] ?? "medium";
}

// ---------------------------------------------------------------------------
// Auto-approve policy
// ---------------------------------------------------------------------------

export function canAutoApprove(label: string, mode: string): boolean {
  const risk = getTaskRisk(label);
  if (risk === "high" && mode !== "live") return false;
  if (risk === "high" && mode === "live") return true;
  return risk === "low" || risk === "medium";
}

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

const FAILURE_PATTERNS: Array<{
  test: (msg: string) => boolean;
  category: FailureCategory;
  action: ClassifiedFailure["action"];
  retryDelayMs?: number;
}> = [
  {
    test: (m) => /token.*expir|OAuthException|invalid.*token/i.test(m),
    category: "token_expired",
    action: "reauth",
  },
  {
    test: (m) => /rate.?limit|too many requests|429/i.test(m),
    category: "rate_limit",
    action: "backoff",
    retryDelayMs: 60_000,
  },
  {
    test: (m) => /content.*policy|community.*standard|spam/i.test(m),
    category: "content_policy",
    action: "review",
  },
  {
    test: (m) => /ECONNREFUSED|ETIMEDOUT|network|fetch failed/i.test(m),
    category: "network",
    action: "retry",
    retryDelayMs: 10_000,
  },
  {
    test: (m) => /column.*does not exist|schema|migration/i.test(m),
    category: "schema_drift",
    action: "escalate",
  },
  {
    test: (m) => /missing.*config|not configured|no.*found/i.test(m),
    category: "missing_config",
    action: "escalate",
  },
];

export function classifyFailure(errorMessage: string): ClassifiedFailure {
  for (const pattern of FAILURE_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return {
        category: pattern.category,
        action: pattern.action,
        message: errorMessage,
        retryDelayMs: pattern.retryDelayMs,
      };
    }
  }
  return {
    category: "unknown",
    action: "escalate",
    message: errorMessage,
  };
}

// ---------------------------------------------------------------------------
// Max concurrent tasks per workspace
// ---------------------------------------------------------------------------

export function getMaxConcurrentTasks(): number {
  return 5;
}

// ---------------------------------------------------------------------------
// Supervisor schedule: how often each cycle runs (ms)
// ---------------------------------------------------------------------------

export const SUPERVISOR_INTERVALS = {
  plan: 10 * 60 * 1000,
  monitor: 5 * 60 * 1000,
  report: 60 * 60 * 1000,
} as const;
