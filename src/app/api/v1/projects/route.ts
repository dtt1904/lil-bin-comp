import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { ProjectStatus } from "@/generated/prisma/enums";
import { effectiveWorkspaceId } from "@/lib/workspace-request";
import { assertWorkspaceInOrganization } from "@/lib/workspace-access";

const VALID_STATUSES = Object.values(ProjectStatus);

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const {
    workspaceId,
    status,
    limit: rawLimit,
    offset: rawOffset,
  } = parseSearchParams(req);

  const where: Record<string, unknown> = {
    organizationId: auth.ctx.organizationId,
  };
  const ws = effectiveWorkspaceId(req, workspaceId);
  if (ws) {
    const gate = await assertWorkspaceInOrganization(ws, auth.ctx.organizationId);
    if (!gate.ok) return gate.response;
    where.workspaceId = ws;
  }
  if (status) {
    if (!VALID_STATUSES.includes(status as ProjectStatus)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }
    where.status = status as ProjectStatus;
  }

  const limit = rawLimit ? parseInt(rawLimit, 10) : 50;
  const offset = rawOffset ? parseInt(rawOffset, 10) : 0;

  try {
    const [results, total] = await Promise.all([
      prisma.project.findMany({ where, take: limit, skip: offset }),
      prisma.project.count({ where }),
    ]);

    return jsonResponse({ data: results, meta: { total, limit, offset } });
  } catch {
    return errorResponse("Internal error", 500);
  }
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

  const { workspaceId, name, slug, description, status, departmentId } =
    body as {
      workspaceId?: string;
      name?: string;
      slug?: string;
      description?: string;
      status?: string;
      departmentId?: string;
    };

  const missing: string[] = [];
  if (!workspaceId) missing.push("workspaceId");
  if (!name) missing.push("name");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  const resolvedStatus = status ?? "ACTIVE";
  if (!VALID_STATUSES.includes(resolvedStatus as ProjectStatus)) {
    return errorResponse(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

  try {
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId!, organizationId: auth.ctx.organizationId },
    });
    if (!workspace) {
      return errorResponse(`Workspace "${workspaceId}" not found`, 400, {
        field: "workspaceId",
      });
    }

    const resolvedSlug =
      slug ||
      name!
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

    const project = await prisma.project.create({
      data: {
        organizationId: workspace.organizationId,
        workspaceId: workspaceId!,
        name: name!,
        slug: resolvedSlug,
        description,
        status: resolvedStatus as ProjectStatus,
        departmentId,
      },
    });

    return jsonResponse({ data: project }, 201);
  } catch (e: any) {
    if (e.code === "P2002") {
      return errorResponse("Project with this slug already exists", 409);
    }
    return errorResponse("Internal error", 500);
  }
}
