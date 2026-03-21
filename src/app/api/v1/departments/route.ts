import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { store, generateId } from "@/lib/store";
import type { Department } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { workspaceId } = parseSearchParams(req);

  let results = store.departments;

  if (workspaceId) {
    results = store.filter(
      store.departments,
      (d) => d.workspaceId === workspaceId
    );
  }

  return jsonResponse({ data: results, meta: { total: results.length } });
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { workspaceId, name, description } = body as {
    workspaceId?: string;
    name?: string;
    description?: string;
  };

  const missing: string[] = [];
  if (!workspaceId) missing.push("workspaceId");
  if (!name) missing.push("name");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  const workspace = store.findById(store.workspaces, workspaceId!);
  if (!workspace) {
    return errorResponse(
      `Workspace "${workspaceId}" not found`,
      400,
      { field: "workspaceId" }
    );
  }

  const now = new Date();
  const department: Department = {
    id: generateId("dept"),
    workspaceId: workspaceId!,
    name: name!,
    description: description ?? undefined,
    createdAt: now,
    updatedAt: now,
  };

  store.insert(store.departments, department);

  return jsonResponse({ data: department }, 201);
}
