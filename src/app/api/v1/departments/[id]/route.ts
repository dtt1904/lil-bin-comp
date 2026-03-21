import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { store } from "@/lib/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const department = store.findById(store.departments, id);
  if (!department) {
    return errorResponse("Department not found", 404);
  }

  const agentCount = store.filter(
    store.agents,
    (a) => a.departmentId === id
  ).length;
  const taskCount = store.filter(
    store.tasks,
    (t) => t.workspaceId === department.workspaceId
  ).length;

  return jsonResponse({
    data: {
      ...department,
      _counts: {
        agents: agentCount,
        tasks: taskCount,
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
  const existing = store.findById(store.departments, id);
  if (!existing) {
    return errorResponse("Department not found", 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { name, description, workspaceId } = body as {
    name?: string;
    description?: string;
    workspaceId?: string;
  };

  if (workspaceId) {
    const workspace = store.findById(store.workspaces, workspaceId);
    if (!workspace) {
      return errorResponse(
        `Workspace "${workspaceId}" not found`,
        400,
        { field: "workspaceId" }
      );
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (workspaceId !== undefined) updates.workspaceId = workspaceId;

  const updated = store.update(store.departments, id, updates);

  return jsonResponse({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.departments, id);
  if (!existing) {
    return errorResponse("Department not found", 404);
  }

  const agentsInDept = store.filter(
    store.agents,
    (a) => a.departmentId === id
  );
  for (const agent of agentsInDept) {
    store.update(store.agents, agent.id, { departmentId: undefined });
  }

  store.remove(store.departments, id);

  return jsonResponse({ success: true });
}
