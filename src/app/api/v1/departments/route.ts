import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { effectiveWorkspaceId } from "@/lib/workspace-request";
import { assertWorkspaceInOrganization } from "@/lib/workspace-access";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const {
    workspaceId,
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

  const limit = rawLimit ? parseInt(rawLimit, 10) : 50;
  const offset = rawOffset ? parseInt(rawOffset, 10) : 0;

  try {
    const [results, total] = await Promise.all([
      prisma.department.findMany({ where, take: limit, skip: offset }),
      prisma.department.count({ where }),
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

  const { workspaceId, name, slug, description } = body as {
    workspaceId?: string;
    name?: string;
    slug?: string;
    description?: string;
  };

  const missing: string[] = [];
  if (!workspaceId) missing.push("workspaceId");
  if (!name) missing.push("name");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
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

    const department = await prisma.department.create({
      data: {
        workspaceId: workspaceId!,
        organizationId: workspace.organizationId,
        name: name!,
        slug: resolvedSlug,
        description,
      },
    });

    return jsonResponse({ data: department }, 201);
  } catch (e: any) {
    if (e.code === "P2002") {
      return errorResponse(
        "Department with this slug already exists in workspace",
        409
      );
    }
    return errorResponse("Internal error", 500);
  }
}
