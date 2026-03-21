import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { store } from "@/lib/store";
import { WorkspaceType } from "@/lib/types";

const VALID_WORKSPACE_TYPES = Object.values(WorkspaceType);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const workspace = store.findById(store.workspaces, id);
  if (!workspace) {
    return errorResponse("Workspace not found", 404);
  }

  const departmentCount = store.filter(
    store.departments,
    (d) => d.workspaceId === id
  ).length;
  const agentCount = store.filter(
    store.agents,
    (a) => a.workspaceId === id
  ).length;
  const taskCount = store.filter(
    store.tasks,
    (t) => t.workspaceId === id
  ).length;
  const projectCount = store.filter(
    store.projects,
    (p) => p.workspaceId === id
  ).length;

  return jsonResponse({
    data: {
      ...workspace,
      _counts: {
        departments: departmentCount,
        agents: agentCount,
        tasks: taskCount,
        projects: projectCount,
      },
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
  const existing = store.findById(store.workspaces, id);
  if (!existing) {
    return errorResponse("Workspace not found", 404);
  }

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

  if (type && !VALID_WORKSPACE_TYPES.includes(type as WorkspaceType)) {
    return errorResponse(
      `Invalid type. Must be one of: ${VALID_WORKSPACE_TYPES.join(", ")}`,
      400
    );
  }

  if (slug && slug !== existing.slug) {
    const slugExists =
      store.filter(store.workspaces, (w) => w.slug === slug).length > 0;
    if (slugExists) {
      return errorResponse(
        `Workspace with slug "${slug}" already exists`,
        409
      );
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (type !== undefined) updates.type = type as WorkspaceType;
  if (description !== undefined) updates.description = description;
  if (iconUrl !== undefined) updates.iconUrl = iconUrl;

  const updated = store.update(store.workspaces, id, updates);

  return jsonResponse({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.workspaces, id);
  if (!existing) {
    return errorResponse("Workspace not found", 404);
  }

  const departmentsToRemove = store.filter(
    store.departments,
    (d) => d.workspaceId === id
  );
  for (const dept of departmentsToRemove) {
    store.remove(store.departments, dept.id);
  }

  const tasksToRemove = store.filter(
    store.tasks,
    (t) => t.workspaceId === id
  );
  for (const task of tasksToRemove) {
    store.remove(store.tasks, task.id);
  }

  const agentsToReassign = store.filter(
    store.agents,
    (a) => a.workspaceId === id
  );
  for (const agent of agentsToReassign) {
    store.update(store.agents, agent.id, {
      workspaceId: undefined,
      departmentId: undefined,
    });
  }

  const projectsToRemove = store.filter(
    store.projects,
    (p) => p.workspaceId === id
  );
  for (const project of projectsToRemove) {
    store.remove(store.projects, project.id);
  }

  store.remove(store.workspaces, id);

  return jsonResponse({ success: true });
}
