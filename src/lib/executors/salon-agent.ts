/**
 * Salon chat executor — handles salon:chat tasks.
 *
 * When a salon owner sends a message, it's stored as a task with label "salon:chat".
 * This executor runs the LangGraph salon sub-graph, scoped to the owner's workspace.
 */

import type { ExecutorFn, ClaimedTask } from "../runner";
import type { PrismaClient } from "../../generated/prisma/client";
import { runSalonAgent } from "../langgraph/salon-graph";

export const salonChatExecutor: ExecutorFn = async (
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

  const ownerMessage = task.description || task.title;
  console.log(`[salon:chat] Processing for "${workspace.name}": "${ownerMessage.slice(0, 80)}"`);

  const result = await runSalonAgent(prisma, {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    organizationId: workspace.organizationId,
    ownerMessage,
  });

  await prisma.logEvent.create({
    data: {
      level: result.error ? "WARN" : "INFO",
      source: "salon:chat",
      message: `Chat response for ${workspace.name}: ${result.intent} — ${result.actionsTaken.length} actions`,
      metadata: {
        intent: result.intent,
        actions: result.actionsTaken.length,
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
      actionsTaken: result.actionsTaken,
      error: result.error,
    },
  };
};
