import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { store } from "@/lib/store";
import { AgentStatus, Visibility } from "@/lib/types";

const VALID_STATUSES = Object.values(AgentStatus);
const VALID_VISIBILITY = Object.values(Visibility);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const agent = store.findById(store.agents, id);
  if (!agent) {
    return errorResponse("Agent not found", 404);
  }

  const currentTask = store.filter(
    store.tasks,
    (t) => t.agentId === id && (t.status === "RUNNING" || t.status === "QUEUED")
  )[0] ?? null;

  const recentTaskRuns = store
    .filter(store.taskRuns, (tr) => tr.agentId === id)
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )
    .slice(0, 10);

  const costRecords = store.filter(
    store.costRecords,
    (c) => c.agentId === id
  );
  const costSummary = {
    totalCostUsd: costRecords.reduce((sum, c) => sum + c.costUsd, 0),
    totalInputTokens: costRecords.reduce((sum, c) => sum + c.inputTokens, 0),
    totalOutputTokens: costRecords.reduce((sum, c) => sum + c.outputTokens, 0),
    recordCount: costRecords.length,
  };

  return jsonResponse({
    data: {
      ...agent,
      currentTask,
      recentTaskRuns,
      costSummary,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.agents, id);
  if (!existing) {
    return errorResponse("Agent not found", 404);
  }

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
    model,
    provider,
    systemPrompt,
    status,
    workspaceId,
    departmentId,
    capabilities,
    tags,
    visibility,
  } = body as {
    name?: string;
    slug?: string;
    description?: string;
    model?: string;
    provider?: string;
    systemPrompt?: string;
    status?: string;
    workspaceId?: string;
    departmentId?: string;
    capabilities?: string[];
    tags?: string[];
    visibility?: string;
  };

  if (status && !VALID_STATUSES.includes(status as AgentStatus)) {
    return errorResponse(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

  if (visibility && !VALID_VISIBILITY.includes(visibility as Visibility)) {
    return errorResponse(
      `Invalid visibility. Must be one of: ${VALID_VISIBILITY.join(", ")}`,
      400
    );
  }

  if (slug && slug !== existing.slug) {
    const slugExists =
      store.filter(store.agents, (a) => a.slug === slug).length > 0;
    if (slugExists) {
      return errorResponse(`Agent with slug "${slug}" already exists`, 409);
    }
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

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (description !== undefined) updates.description = description;
  if (model !== undefined) updates.model = model;
  if (provider !== undefined) updates.provider = provider;
  if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
  if (status !== undefined) updates.status = status as AgentStatus;
  if (workspaceId !== undefined) updates.workspaceId = workspaceId;
  if (departmentId !== undefined) updates.departmentId = departmentId;
  if (capabilities !== undefined) updates.capabilities = capabilities;
  if (tags !== undefined) updates.tags = tags;
  if (visibility !== undefined) updates.visibility = visibility as Visibility;

  const updated = store.update(store.agents, id, updates);

  return jsonResponse({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.agents, id);
  if (!existing) {
    return errorResponse("Agent not found", 404);
  }

  store.remove(store.agents, id);

  return jsonResponse({ success: true });
}
