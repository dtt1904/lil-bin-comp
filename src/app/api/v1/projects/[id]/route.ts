import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { store } from "@/lib/store";
import { ProjectStatus } from "@/lib/types";

const VALID_STATUSES = Object.values(ProjectStatus);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const project = store.findById(store.projects, id);
  if (!project) {
    return errorResponse("Project not found", 404);
  }

  const tasks = store.filter(store.tasks, (t) => t.projectId === id);
  const tasksByStatus: Record<string, number> = {};
  for (const task of tasks) {
    tasksByStatus[task.status] = (tasksByStatus[task.status] ?? 0) + 1;
  }

  const agentIds = new Set(
    tasks.filter((t) => t.agentId).map((t) => t.agentId!)
  );
  const agents = store.filter(store.agents, (a) => agentIds.has(a.id));

  return jsonResponse({
    data: {
      ...project,
      _counts: {
        tasks: tasks.length,
        tasksByStatus,
      },
      agents,
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
  const existing = store.findById(store.projects, id);
  if (!existing) {
    return errorResponse("Project not found", 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { name, description, status, ownerId, startDate, endDate, workspaceId } =
    body as {
      name?: string;
      description?: string;
      status?: string;
      ownerId?: string;
      startDate?: string;
      endDate?: string;
      workspaceId?: string;
    };

  if (status && !VALID_STATUSES.includes(status as ProjectStatus)) {
    return errorResponse(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

  if (workspaceId) {
    const workspace = store.findById(store.workspaces, workspaceId);
    if (!workspace) {
      return errorResponse(`Workspace "${workspaceId}" not found`, 400, {
        field: "workspaceId",
      });
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status as ProjectStatus;
  if (ownerId !== undefined) updates.ownerId = ownerId;
  if (workspaceId !== undefined) updates.workspaceId = workspaceId;
  if (startDate !== undefined)
    updates.startDate = startDate ? new Date(startDate) : undefined;
  if (endDate !== undefined)
    updates.endDate = endDate ? new Date(endDate) : undefined;

  const updated = store.update(store.projects, id, updates);

  return jsonResponse({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.projects, id);
  if (!existing) {
    return errorResponse("Project not found", 404);
  }

  const projectTasks = store.filter(store.tasks, (t) => t.projectId === id);
  for (const task of projectTasks) {
    store.update(store.tasks, task.id, { projectId: undefined });
  }

  store.remove(store.projects, id);

  return jsonResponse({ success: true });
}
