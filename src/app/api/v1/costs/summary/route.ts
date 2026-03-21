import { NextRequest } from "next/server";
import { authenticateRequest, jsonResponse } from "@/lib/api-auth";
import { store } from "@/lib/store";
import type { CostRecord } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const records = store.costRecords;
  const now = new Date();

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalCost = 0;
  let totalTokens = 0;
  let costToday = 0;
  let costThisWeek = 0;
  let costThisMonth = 0;

  const agentMap = new Map<string, number>();
  const workspaceMap = new Map<string, number>();
  const modelMap = new Map<string, number>();

  for (const r of records) {
    totalCost += r.costUsd;
    totalTokens += r.inputTokens + r.outputTokens;

    const ts = new Date(r.recordedAt).getTime();
    if (ts >= startOfDay.getTime()) costToday += r.costUsd;
    if (ts >= startOfWeek.getTime()) costThisWeek += r.costUsd;
    if (ts >= startOfMonth.getTime()) costThisMonth += r.costUsd;

    if (r.agentId) {
      agentMap.set(r.agentId, (agentMap.get(r.agentId) ?? 0) + r.costUsd);
    }
    if (r.workspaceId) {
      workspaceMap.set(
        r.workspaceId,
        (workspaceMap.get(r.workspaceId) ?? 0) + r.costUsd,
      );
    }
    modelMap.set(r.model, (modelMap.get(r.model) ?? 0) + r.costUsd);
  }

  const toArray = (map: Map<string, number>) =>
    Array.from(map.entries()).map(([id, cost]) => ({ id, cost }));

  return jsonResponse({
    data: {
      totalCost,
      totalTokens,
      costByAgent: toArray(agentMap),
      costByWorkspace: toArray(workspaceMap),
      costByModel: toArray(modelMap),
      costToday,
      costThisWeek,
      costThisMonth,
    },
  });
}
