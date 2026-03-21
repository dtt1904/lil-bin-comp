import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { store, generateId } from "@/lib/store";
import type { PromptTemplate } from "@/lib/types";
import { Visibility } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const q = parseSearchParams(req);
  let results = store.promptTemplates;

  if (q.workspaceId) {
    results = store.filter(results, (p) => p.workspaceId === q.workspaceId);
  }
  if (q.visibility) {
    results = store.filter(results, (p) => p.visibility === q.visibility);
  }
  if (q.search) {
    const s = q.search.toLowerCase();
    results = store.filter(
      results,
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.description?.toLowerCase().includes(s) ?? false) ||
        p.template.toLowerCase().includes(s),
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

  if (!body.name || !body.template) {
    return errorResponse("name and template are required");
  }

  const prompt: PromptTemplate = {
    id: generateId("prompt"),
    organizationId: auth.ctx.organizationId,
    workspaceId: body.workspaceId,
    name: body.name,
    description: body.description,
    template: body.template,
    variables: body.variables ?? [],
    visibility: body.visibility ?? Visibility.WORKSPACE,
    createdById: body.createdById ?? "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  store.insert(store.promptTemplates, prompt);
  return jsonResponse({ data: prompt }, 201);
}
