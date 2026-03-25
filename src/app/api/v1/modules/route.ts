import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { ModuleStatus, LogLevel } from "@/generated/prisma/enums";
import { effectiveWorkspaceId } from "@/lib/workspace-request";
import { assertWorkspaceInOrganization } from "@/lib/workspace-access";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const q = parseSearchParams(req);
  const limit = parseInt(q.limit || "50", 10);
  const offset = parseInt(q.offset || "0", 10);

  try {
    const where: Record<string, unknown> = {
      organizationId: auth.ctx.organizationId,
    };

    const ws = effectiveWorkspaceId(req, q.workspaceId);
    if (ws) {
      const gate = await assertWorkspaceInOrganization(ws, auth.ctx.organizationId);
      if (!gate.ok) return gate.response;
      where.workspaceId = ws;
    }
    if (q.status) where.status = q.status as ModuleStatus;

    const [data, total] = await Promise.all([
      prisma.moduleInstallation.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.moduleInstallation.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset } });
  } catch (err) {
    return errorResponse(`Failed to fetch modules: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.workspaceId || !body.moduleSlug || !body.moduleName) {
    return errorResponse(
      "workspaceId, moduleSlug, and moduleName are required",
    );
  }

  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: body.workspaceId,
        organizationId: auth.ctx.organizationId,
      },
    });
    if (!workspace) return errorResponse("Workspace not found", 404);

    const duplicate = await prisma.moduleInstallation.findUnique({
      where: {
        moduleType_workspaceId: {
          moduleType: body.moduleSlug,
          workspaceId: body.workspaceId,
        },
      },
    });
    if (duplicate) {
      return errorResponse(
        `Module "${body.moduleSlug}" is already installed in workspace ${body.workspaceId}`,
        409,
      );
    }

    const installation = await prisma.moduleInstallation.create({
      data: {
        workspaceId: body.workspaceId,
        organizationId: workspace.organizationId,
        moduleType: body.moduleSlug,
        status: ModuleStatus.ACTIVE,
        config: body.config ?? undefined,
      },
    });

    await prisma.logEvent.create({
      data: {
        organizationId: workspace.organizationId,
        workspaceId: body.workspaceId,
        level: LogLevel.INFO,
        source: "api",
        message: `Module "${body.moduleName}" (${body.moduleSlug}) installed`,
        metadata: { moduleId: installation.id, moduleType: body.moduleSlug },
      },
    });

    return jsonResponse({ data: installation }, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already installed")) {
      return errorResponse(err.message, 409);
    }
    return errorResponse(`Failed to install module: ${err instanceof Error ? err.message : err}`, 500);
  }
}
