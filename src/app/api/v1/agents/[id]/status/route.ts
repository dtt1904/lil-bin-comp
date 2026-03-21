import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { store, generateId } from "@/lib/store";
import { AgentStatus, LogLevel } from "@/lib/types";
import type { AgentHeartbeat, LogEvent } from "@/lib/types";

const VALID_STATUSES = Object.values(AgentStatus);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const agent = store.findById(store.agents, id);
  if (!agent) {
    return errorResponse("Agent not found", 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { status } = body as { status?: string };

  if (!status) {
    return errorResponse("Missing required field: status", 400);
  }

  if (!VALID_STATUSES.includes(status as AgentStatus)) {
    return errorResponse(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

  const previousStatus = agent.status;
  const now = new Date();

  store.update(store.agents, id, {
    status: status as AgentStatus,
    lastActiveAt: now,
    updatedAt: now,
  });

  const heartbeat: AgentHeartbeat = {
    id: generateId("hb"),
    agentId: id,
    status: status as AgentStatus,
    timestamp: now,
  };
  store.insert(store.agentHeartbeats, heartbeat);

  const logEvent: LogEvent = {
    id: generateId("log"),
    organizationId: auth.ctx.organizationId,
    workspaceId: agent.workspaceId,
    agentId: id,
    level: LogLevel.INFO,
    message: `Agent status changed from ${previousStatus} to ${status}`,
    metadata: { previousStatus, newStatus: status },
    timestamp: now,
  };
  store.insert(store.logEvents, logEvent);

  const updated = store.findById(store.agents, id);

  return jsonResponse({
    data: {
      agent: updated,
      heartbeat,
      logEvent,
    },
  });
}
