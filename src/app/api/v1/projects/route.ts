import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { store, generateId } from "@/lib/store";
import { ProjectStatus } from "@/lib/types";
import type { Project } from "@/lib/types";

const VALID_STATUSES = Object.values(ProjectStatus);

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { workspaceId, status } = parseSearchParams(req);

  let results = store.projects;

  if (workspaceId) {
    results = store.filter(results, (p) => p.workspaceId === workspaceId);
  }
  if (status) {
    if (!VALID_STATUSES.includes(status as ProjectStatus)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }
    results = store.filter(
      results,
      (p) => p.status === (status as ProjectStatus)
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

  const { workspaceId, name, description, status, ownerId, startDate, endDate } =
    body as {
      workspaceId?: string;
      name?: string;
      description?: string;
      status?: string;
      ownerId?: string;
      startDate?: string;
      endDate?: string;
    };

  const missing: string[] = [];
  if (!workspaceId) missing.push("workspaceId");
  if (!name) missing.push("name");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  const workspace = store.findById(store.workspaces, workspaceId!);
  if (!workspace) {
    return errorResponse(`Workspace "${workspaceId}" not found`, 400, {
      field: "workspaceId",
    });
  }

  const resolvedStatus = status ?? ProjectStatus.ACTIVE;
  if (!VALID_STATUSES.includes(resolvedStatus as ProjectStatus)) {
    return errorResponse(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

  const now = new Date();
  const project: Project = {
    id: generateId("proj"),
    workspaceId: workspaceId!,
    name: name!,
    description: description ?? undefined,
    status: resolvedStatus as ProjectStatus,
    ownerId: ownerId ?? "user-1",
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    createdAt: now,
    updatedAt: now,
  };

  store.insert(store.projects, project);

  return jsonResponse({ data: project }, 201);
}
