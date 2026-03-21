import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { store, generateId } from "@/lib/store";
import type { MemoryEntry } from "@/lib/types";
import { MemoryType, Visibility } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const q = parseSearchParams(req);
  let results = store.memoryEntries;

  if (q.workspaceId) {
    results = store.filter(results, (m) => m.workspaceId === q.workspaceId);
  }
  if (q.agentId) {
    results = store.filter(results, (m) => m.agentId === q.agentId);
  }
  if (q.type) {
    results = store.filter(results, (m) => m.type === q.type);
  }
  if (q.visibility) {
    results = store.filter(results, (m) => m.visibility === q.visibility);
  }
  if (q.search) {
    const s = q.search.toLowerCase();
    results = store.filter(
      results,
      (m) =>
        m.title.toLowerCase().includes(s) ||
        m.content.toLowerCase().includes(s),
    );
  }
  if (q.tags) {
    const tags = q.tags.split(",").map((t) => t.trim().toLowerCase());
    results = store.filter(results, (m) =>
      tags.some((tag) => m.tags.map((t) => t.toLowerCase()).includes(tag)),
    );
  }

  const total = results.length;
  const limit = parseInt(q.limit || "50", 10);
  const offset = parseInt(q.offset || "0", 10);
  const page = results.slice(offset, offset + limit);

  return jsonResponse({ data: page, meta: { total, limit, offset } });
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.title || !body.content || !body.type) {
    return errorResponse("title, content, and type are required");
  }

  if (!Object.values(MemoryType).includes(body.type)) {
    return errorResponse(`Invalid type. Must be one of: ${Object.values(MemoryType).join(", ")}`);
  }

  const entry: MemoryEntry = {
    id: generateId("mem"),
    organizationId: auth.ctx.organizationId,
    workspaceId: body.workspaceId,
    agentId: body.agentId,
    type: body.type,
    title: body.title,
    content: body.content,
    tags: body.tags ?? [],
    visibility: body.visibility ?? Visibility.WORKSPACE,
    createdById: body.createdById ?? "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  store.insert(store.memoryEntries, entry);
  return jsonResponse({ data: entry }, 201);
}
