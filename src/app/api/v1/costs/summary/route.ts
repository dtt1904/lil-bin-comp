import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest, jsonResponse, errorResponse } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const organizationId = auth.ctx.organizationId;
    const now = new Date();

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const baseWhere = { organizationId };

    const [
      totals,
      todayTotals,
      weekTotals,
      monthTotals,
      byAgent,
      byWorkspace,
      byModel,
    ] = await Promise.all([
      prisma.costRecord.aggregate({
        _sum: { cost: true, tokensInput: true, tokensOutput: true },
        where: baseWhere,
      }),
      prisma.costRecord.aggregate({
        _sum: { cost: true },
        where: { ...baseWhere, createdAt: { gte: startOfDay } },
      }),
      prisma.costRecord.aggregate({
        _sum: { cost: true },
        where: { ...baseWhere, createdAt: { gte: startOfWeek } },
      }),
      prisma.costRecord.aggregate({
        _sum: { cost: true },
        where: { ...baseWhere, createdAt: { gte: startOfMonth } },
      }),
      prisma.costRecord.groupBy({
        by: ["agentId"],
        _sum: { cost: true },
        where: baseWhere,
      }),
      prisma.costRecord.groupBy({
        by: ["workspaceId"],
        _sum: { cost: true },
        where: baseWhere,
      }),
      prisma.costRecord.groupBy({
        by: ["model"],
        _sum: { cost: true },
        where: baseWhere,
      }),
    ]);

    return jsonResponse({
      data: {
        totalCost: totals._sum.cost ?? 0,
        totalTokens: (totals._sum.tokensInput ?? 0) + (totals._sum.tokensOutput ?? 0),
        costByAgent: byAgent.map((g) => ({ id: g.agentId ?? "unassigned", cost: g._sum.cost ?? 0 })),
        costByWorkspace: byWorkspace.map((g) => ({ id: g.workspaceId ?? "unassigned", cost: g._sum.cost ?? 0 })),
        costByModel: byModel.map((g) => ({ id: g.model, cost: g._sum.cost ?? 0 })),
        costToday: todayTotals._sum.cost ?? 0,
        costThisWeek: weekTotals._sum.cost ?? 0,
        costThisMonth: monthTotals._sum.cost ?? 0,
      },
    });
  } catch (err) {
    return errorResponse(`Failed to fetch cost summary: ${err instanceof Error ? err.message : err}`, 500);
  }
}
