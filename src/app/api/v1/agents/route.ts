import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { store, generateId } from "@/lib/store";
import { AgentStatus, Visibility } from "@/lib/types";
import type { Agent } from "@/lib/types";

const VALID_STATUSES = Object.values(AgentStatus);
const VALID_VISIBILITY = Object.values(Visibility);

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { workspaceId, departmentId, status } = parseSearchParams(req);

  let results = store.agents;

  if (workspaceId) {
    results = store.filter(results, (a) => a.workspaceId === workspaceId);
  }
  if (departmentId) {
    results = store.filter(results, (a) => a.departmentId === departmentId);
  }
  if (status) {
    if (!VALID_STATUSES.includes(status as AgentStatus)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }
    results = store.filter(
      results,
      (a) => a.status === (status as AgentStatus)
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

  const {
    name,
    slug,
    description,
    workspaceId,
    departmentId,
    model,
    provider,
    systemPrompt,
    visibility,
    capabilities,
    tags,
    status,
  } = body as {
    name?: string;
    slug?: string;
    description?: string;
    workspaceId?: string;
    departmentId?: string;
    model?: string;
    provider?: string;
    systemPrompt?: string;
    visibility?: string;
    capabilities?: string[];
    tags?: string[];
    status?: string;
  };

  const missing: string[] = [];
  if (!name) missing.push("name");
  if (!slug) missing.push("slug");
  if (!model) missing.push("model");
  if (!provider) missing.push("provider");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  if (status && !VALID_STATUSES.includes(status as AgentStatus)) {
    return errorResponse(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

  const resolvedVisibility = visibility ?? Visibility.WORKSPACE;
  if (!VALID_VISIBILITY.includes(resolvedVisibility as Visibility)) {
    return errorResponse(
      `Invalid visibility. Must be one of: ${VALID_VISIBILITY.join(", ")}`,
      400
    );
  }

  const slugExists =
    store.filter(store.agents, (a) => a.slug === slug).length > 0;
  if (slugExists) {
    return errorResponse(`Agent with slug "${slug}" already exists`, 409);
  }

  if (workspaceId) {
    const workspace = store.findById(store.workspaces, workspaceId);
    if (!workspace) {
      return errorResponse(`Workspace "${workspaceId}" not found`, 400, {
        field: "workspaceId",
      });
    }
  }

  if (departmentId) {
    const department = store.findById(store.departments, departmentId);
    if (!department) {
      return errorResponse(`Department "${departmentId}" not found`, 400, {
        field: "departmentId",
      });
    }
  }

  const now = new Date();
  const agent: Agent = {
    id: generateId("agent"),
    organizationId: auth.ctx.organizationId,
    workspaceId: workspaceId ?? undefined,
    departmentId: departmentId ?? undefined,
    name: name!,
    slug: slug!,
    description: description ?? undefined,
    status: (status as AgentStatus) ?? AgentStatus.IDLE,
    model: model!,
    provider: provider!,
    systemPrompt: systemPrompt ?? undefined,
    visibility: resolvedVisibility as Visibility,
    capabilities: capabilities ?? [],
    tags: tags ?? [],
    createdById: "user-1",
    createdAt: now,
    updatedAt: now,
  };

  store.insert(store.agents, agent);

  return jsonResponse({ data: agent }, 201);
}
