/**
 * Workspace chat executor — handles workspace:chat tasks.
 *
 * Universal replacement for salon:chat — works for ANY workspace type.
 * Routes through the generalized workspace-agent LangGraph.
 */

import type { ExecutorFn, ClaimedTask } from "../runner";
import type { PrismaClient } from "../../generated/prisma/client";
import { runWorkspaceAgent } from "../langgraph/workspace-agent";

export const workspaceChatExecutor: ExecutorFn = async (
  task: ClaimedTask,
  prisma: PrismaClient
) => {
  const workspaceId = task.workspaceId;
  if (!workspaceId) {
    return { output: { error: "No workspace associated with this chat task" } };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, organizationId: true },
  });

  if (!workspace) {
    return { output: { error: `Workspace ${workspaceId} not found` } };
  }

  const message = task.description || task.title;
  console.log(`[workspace:chat] Processing for "${workspace.name}": "${message.slice(0, 80)}"`);

  const result = await runWorkspaceAgent(prisma, {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    organizationId: workspace.organizationId,
    message,
    role: "owner",
  });

  await prisma.logEvent.create({
    data: {
      level: result.error ? "WARN" : "INFO",
      source: "workspace:chat",
      message: `Chat for ${workspace.name}: ${result.intent}${result.targetDepartment ? ` → ${result.targetDepartment}` : ""} — ${result.actions.length} actions`,
      metadata: {
        intent: result.intent,
        department: result.targetDepartment ?? "none",
        actions: result.actions.length,
        hasError: !!result.error,
      } as Record<string, string | number | boolean | null>,
      organizationId: workspace.organizationId,
      workspaceId: workspace.id,
      taskId: task.id,
    },
  });

  return {
    output: {
      response: result.response,
      intent: result.intent,
      department: result.targetDepartment,
      actions: result.actions,
      error: result.error,
    },
  };
};
