import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateStreamRequest } from "@/lib/api-auth";
import { createSseResponse } from "@/lib/sse";
import {
  readStreamWorkspaceId,
  validateStreamWorkspace,
} from "@/lib/stream-workspace";
import { AgentStatus, TaskStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

async function loadDashboard(organizationId: string, workspaceId?: string) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const taskScope = workspaceId
    ? {
        organizationId,
        workspaceId,
        status: { in: [TaskStatus.RUNNING, TaskStatus.QUEUED] },
      }
    : {
        organizationId,
        status: { in: [TaskStatus.RUNNING, TaskStatus.QUEUED] },
      };

  const agentScope = workspaceId
    ? {
        organizationId,
        workspaceId,
        status: { in: [AgentStatus.ONLINE, AgentStatus.BUSY] },
      }
    : {
        organizationId,
        status: { in: [AgentStatus.ONLINE, AgentStatus.BUSY] },
      };

  const agentTotalScope = workspaceId
    ? { organizationId, workspaceId }
    : { organizationId };

  const costScope = workspaceId
    ? {
        organizationId,
        workspaceId,
        createdAt: { gte: todayStart },
      }
    : { organizationId, createdAt: { gte: todayStart } };

  const [activeTaskCount, pendingApprovalCount, activeAgentCount, totalAgentCount, todayCostAgg] =
    await Promise.all([
      prisma.task.count({ where: taskScope }),
      prisma.approval.count({
        where: {
          status: "PENDING",
          requestedBy: { organizationId },
          ...(workspaceId ? { task: { workspaceId } } : {}),
        },
      }),
      prisma.agent.count({ where: agentScope }),
      prisma.agent.count({ where: agentTotalScope }),
      prisma.costRecord.aggregate({
        _sum: { cost: true },
        where: costScope,
      }),
    ]);

  return {
    activeTaskCount,
    pendingApprovalCount,
    activeAgentCount,
    totalAgentCount,
    todayCost: todayCostAgg._sum.cost ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const auth = authenticateStreamRequest(req);
  if (!auth.ok) return auth.response;

  const requestedWs = readStreamWorkspaceId(req);
  const workspaceId = await validateStreamWorkspace(
    requestedWs,
    auth.ctx.organizationId
  );
  if (requestedWs && !workspaceId) {
    return NextResponse.json({ error: "Invalid workspaceId for stream" }, { status: 403 });
  }

  return createSseResponse((send) => {
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      try {
        send("dashboard", {
          data: await loadDashboard(auth.ctx.organizationId, workspaceId),
        });
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : String(err) });
      }
    };

    void tick();
    const id = setInterval(() => void tick(), 4000);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  });
}
