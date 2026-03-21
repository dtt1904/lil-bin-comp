import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { store, generateId } from "@/lib/store";
import type { SOPDocument } from "@/lib/types";
import { Visibility } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const q = parseSearchParams(req);
  let results = store.sopDocuments;

  if (q.workspaceId) {
    results = store.filter(results, (s) => s.workspaceId === q.workspaceId);
  }
  if (q.visibility) {
    results = store.filter(results, (s) => s.visibility === q.visibility);
  }
  if (q.search) {
    const s = q.search.toLowerCase();
    results = store.filter(
      results,
      (doc) =>
        doc.title.toLowerCase().includes(s) ||
        doc.content.toLowerCase().includes(s),
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

  if (!body.title || !body.content) {
    return errorResponse("title and content are required");
  }

  const doc: SOPDocument = {
    id: generateId("sop"),
    organizationId: auth.ctx.organizationId,
    workspaceId: body.workspaceId,
    title: body.title,
    content: body.content,
    version: 1,
    visibility: body.visibility ?? Visibility.WORKSPACE,
    createdById: body.createdById ?? "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  store.insert(store.sopDocuments, doc);
  return jsonResponse({ data: doc }, 201);
}
