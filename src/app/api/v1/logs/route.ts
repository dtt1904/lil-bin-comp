import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { store, generateId } from "@/lib/store";
import type { LogEvent } from "@/lib/types";
import { LogLevel } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const q = parseSearchParams(req);
  let results = store.logEvents;

  if (q.workspaceId) {
    results = store.filter(results, (l) => l.workspaceId === q.workspaceId);
  }
  if (q.agentId) {
    results = store.filter(results, (l) => l.agentId === q.agentId);
  }
  if (q.taskId) {
    results = store.filter(results, (l) => l.taskId === q.taskId);
  }
  if (q.level) {
    results = store.filter(results, (l) => l.level === q.level);
  }
  if (q.search) {
    const s = q.search.toLowerCase();
    results = store.filter(results, (l) =>
      l.message.toLowerCase().includes(s),
    );
  }

  results = [...results].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const total = results.length;
  const limit = parseInt(q.limit || "100", 10);
  const offset = parseInt(q.offset || "0", 10);
  const page = results.slice(offset, offset + limit);

  return jsonResponse({ data: page, meta: { total, limit, offset } });
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.level || !body.message) {
    return errorResponse("level and message are required");
  }

  if (!Object.values(LogLevel).includes(body.level)) {
    return errorResponse(`Invalid level. Must be one of: ${Object.values(LogLevel).join(", ")}`);
  }

  const event: LogEvent = {
    id: generateId("log"),
    organizationId: auth.ctx.organizationId,
    workspaceId: body.workspaceId,
    agentId: body.agentId,
    taskId: body.taskId,
    level: body.level,
    message: body.message,
    metadata: body.metadata,
    timestamp: new Date(),
  };

  store.insert(store.logEvents, event);
  return jsonResponse({ data: event }, 201);
}
