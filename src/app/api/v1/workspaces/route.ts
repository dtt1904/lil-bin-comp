import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { store, generateId } from "@/lib/store";
import { WorkspaceType } from "@/lib/types";
import type { Workspace } from "@/lib/types";

const VALID_WORKSPACE_TYPES = Object.values(WorkspaceType);

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { type } = parseSearchParams(req);

  let results = store.workspaces;

  if (type) {
    if (!VALID_WORKSPACE_TYPES.includes(type as WorkspaceType)) {
      return errorResponse(
        `Invalid type. Must be one of: ${VALID_WORKSPACE_TYPES.join(", ")}`,
        400
      );
    }
    results = store.filter(
      store.workspaces,
      (w) => w.type === (type as WorkspaceType)
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

  const { name, slug, type, description, iconUrl } = body as {
    name?: string;
    slug?: string;
    type?: string;
    description?: string;
    iconUrl?: string;
  };

  const missing: string[] = [];
  if (!name) missing.push("name");
  if (!slug) missing.push("slug");
  if (!type) missing.push("type");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  if (!VALID_WORKSPACE_TYPES.includes(type as WorkspaceType)) {
    return errorResponse(
      `Invalid type. Must be one of: ${VALID_WORKSPACE_TYPES.join(", ")}`,
      400
    );
  }

  const slugExists = store.filter(
    store.workspaces,
    (w) => w.slug === slug
  ).length > 0;
  if (slugExists) {
    return errorResponse(`Workspace with slug "${slug}" already exists`, 409);
  }

  const now = new Date();
  const workspace: Workspace = {
    id: generateId("ws"),
    organizationId: auth.ctx.organizationId,
    name: name!,
    slug: slug!,
    type: type as WorkspaceType,
    description: description ?? undefined,
    iconUrl: iconUrl ?? undefined,
    createdAt: now,
    updatedAt: now,
  };

  store.insert(store.workspaces, workspace);

  return jsonResponse({ data: workspace }, 201);
}
