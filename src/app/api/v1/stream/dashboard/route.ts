import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateStreamRequest } from "@/lib/api-auth";
import { createSseResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

async function loadDashboard(organizationId: string) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [activeTaskCount, pendingApprovalCount, activeAgentCount, totalAgentCount, todayCostAgg] =
    await Promise.all([
      prisma.task.count({
        where: { organizationId, status: { in: ["RUNNING", "QUEUED"] } },
      }),
      prisma.approval.count({ where: { status: "PENDING" } }),
      prisma.agent.count({
        where: { organizationId, status: { in: ["ONLINE", "BUSY"] } },
      }),
      prisma.agent.count({ where: { organizationId } }),
      prisma.costRecord.aggregate({
        _sum: { cost: true },
        where: { organizationId, createdAt: { gte: todayStart } },
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

  return createSseResponse((send) => {
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      try {
        send("dashboard", { data: await loadDashboard(auth.ctx.organizationId) });
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
