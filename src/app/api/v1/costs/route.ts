import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const q = parseSearchParams(req);
  const limit = parseInt(q.limit || "50", 10);
  const offset = parseInt(q.offset || "0", 10);

  try {
    const where: Record<string, unknown> = {
      organizationId: auth.ctx.organizationId,
    };

    if (q.workspaceId) where.workspaceId = q.workspaceId;
    if (q.agentId) where.agentId = q.agentId;
    if (q.model) where.model = q.model;
    if (q.provider) where.provider = q.provider;
    if (q.from) where.createdAt = { ...(where.createdAt as object ?? {}), gte: new Date(q.from) };
    if (q.to) where.createdAt = { ...(where.createdAt as object ?? {}), lte: new Date(q.to) };

    if (q.aggregate) {
      const byField = ({
        agent: "agentId",
        workspace: "workspaceId",
        model: "model",
      } as Record<string, string>)[q.aggregate];

      if (byField) {
        const grouped = await prisma.costRecord.groupBy({
          by: [byField as "agentId" | "workspaceId" | "model"],
          _sum: { cost: true, tokensInput: true, tokensOutput: true },
          _count: true,
          where,
        });

        const data = grouped.map((g) => ({
          group: (g as Record<string, unknown>)[byField] as string ?? "unassigned",
          totalCost: g._sum.cost ?? 0,
          totalTokens: (g._sum.tokensInput ?? 0) + (g._sum.tokensOutput ?? 0),
          count: g._count,
        }));

        return jsonResponse({ data });
      }

      if (q.aggregate === "daily") {
        const records = await prisma.costRecord.findMany({
          where,
          orderBy: { createdAt: "asc" },
        });

        const map = new Map<string, { totalCost: number; totalTokens: number; count: number }>();
        for (const r of records) {
          const key = r.createdAt.toISOString().split("T")[0];
          const existing = map.get(key) ?? { totalCost: 0, totalTokens: 0, count: 0 };
          existing.totalCost += r.cost;
          existing.totalTokens += r.tokensInput + r.tokensOutput;
          existing.count += 1;
          map.set(key, existing);
        }

        const data = Array.from(map.entries()).map(([group, stats]) => ({
          group,
          ...stats,
        }));

        return jsonResponse({ data });
      }
    }

    const [data, total] = await Promise.all([
      prisma.costRecord.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.costRecord.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset } });
  } catch (err) {
    return errorResponse(`Failed to fetch costs: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (
    body.model === undefined ||
    body.provider === undefined ||
    body.inputTokens === undefined ||
    body.outputTokens === undefined ||
    body.costUsd === undefined
  ) {
    return errorResponse(
      "model, provider, inputTokens, outputTokens, and costUsd are required",
    );
  }

  try {
    const record = await prisma.costRecord.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: body.workspaceId ?? undefined,
        agentId: body.agentId ?? undefined,
        taskId: body.taskId ?? undefined,
        taskRunId: body.taskRunId ?? undefined,
        model: body.model,
        provider: body.provider,
        tokensInput: body.inputTokens,
        tokensOutput: body.outputTokens,
        cost: body.costUsd,
      },
    });

    return jsonResponse({ data: record }, 201);
  } catch (err) {
    return errorResponse(`Failed to create cost record: ${err instanceof Error ? err.message : err}`, 500);
  }
}
