import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { AgentStatus, LogLevel } from "@/generated/prisma/enums";

const VALID_STATUSES = Object.values(AgentStatus);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (err) {
    console.error("[agents/:id/status] operation failed:", err);
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

  try {
    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) {
      return errorResponse("Agent not found", 404);
    }

    const previousStatus = agent.status;

    const [updated, heartbeat, logEvent] = await prisma.$transaction([
      prisma.agent.update({
        where: { id },
        data: { status: status as AgentStatus },
      }),
      prisma.agentHeartbeat.create({
        data: {
          agentId: id,
          status: status as AgentStatus,
        },
      }),
      prisma.logEvent.create({
        data: {
          organizationId: auth.ctx.organizationId,
          workspaceId: agent.workspaceId,
          agentId: id,
          level: LogLevel.INFO,
          source: "agent-status",
          message: `Agent status changed from ${previousStatus} to ${status}`,
          metadata: { previousStatus, newStatus: status },
        },
      }),
    ]);

    return jsonResponse({
      data: {
        agent: updated,
        heartbeat,
        logEvent,
      },
    });
  } catch (err: any) {
    console.error("[agents/:id/status] operation failed:", err);
    if (err.code === "P2025") return errorResponse("Agent not found", 404);
    return errorResponse(
      `Failed: ${err instanceof Error ? err.message : "unknown"}`,
      500
    );
  }
}
