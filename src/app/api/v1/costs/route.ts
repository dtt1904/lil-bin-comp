import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { store, generateId } from "@/lib/store";
import type { CostRecord } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const q = parseSearchParams(req);
  let results = store.costRecords;

  if (q.workspaceId) {
    results = store.filter(results, (c) => c.workspaceId === q.workspaceId);
  }
  if (q.agentId) {
    results = store.filter(results, (c) => c.agentId === q.agentId);
  }
  if (q.model) {
    results = store.filter(results, (c) => c.model === q.model);
  }
  if (q.provider) {
    results = store.filter(results, (c) => c.provider === q.provider);
  }
  if (q.from) {
    const from = new Date(q.from);
    results = store.filter(
      results,
      (c) => new Date(c.recordedAt).getTime() >= from.getTime(),
    );
  }
  if (q.to) {
    const to = new Date(q.to);
    results = store.filter(
      results,
      (c) => new Date(c.recordedAt).getTime() <= to.getTime(),
    );
  }

  if (q.aggregate) {
    const grouped = aggregateCosts(results, q.aggregate);
    return jsonResponse({ data: grouped });
  }

  const total = results.length;
  const limit = parseInt(q.limit || "50", 10);
  const offset = parseInt(q.offset || "0", 10);
  const page = results.slice(offset, offset + limit);

  return jsonResponse({ data: page, meta: { total, limit, offset } });
}

function aggregateCosts(
  records: CostRecord[],
  by: string,
): { group: string; totalCost: number; totalTokens: number; count: number }[] {
  const map = new Map<
    string,
    { totalCost: number; totalTokens: number; count: number }
  >();

  for (const r of records) {
    let key: string;
    switch (by) {
      case "agent":
        key = r.agentId ?? "unassigned";
        break;
      case "workspace":
        key = r.workspaceId ?? "unassigned";
        break;
      case "model":
        key = r.model;
        break;
      case "daily":
        key = new Date(r.recordedAt).toISOString().split("T")[0];
        break;
      default:
        key = "all";
    }

    const existing = map.get(key) ?? { totalCost: 0, totalTokens: 0, count: 0 };
    existing.totalCost += r.costUsd;
    existing.totalTokens += r.inputTokens + r.outputTokens;
    existing.count += 1;
    map.set(key, existing);
  }

  return Array.from(map.entries()).map(([group, stats]) => ({
    group,
    ...stats,
  }));
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

  const record: CostRecord = {
    id: generateId("cost"),
    organizationId: auth.ctx.organizationId,
    workspaceId: body.workspaceId,
    agentId: body.agentId,
    taskRunId: body.taskRunId,
    model: body.model,
    provider: body.provider,
    inputTokens: body.inputTokens,
    outputTokens: body.outputTokens,
    costUsd: body.costUsd,
    recordedAt: new Date(),
  };

  store.insert(store.costRecords, record);
  return jsonResponse({ data: record }, 201);
}
