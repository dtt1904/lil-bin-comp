import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { WorkspaceType } from "@/generated/prisma/enums";
import {
  getWorkspaceTemplate,
  applyWorkspaceTemplate,
} from "@/lib/workspace-templates";
import { ensureDefaultOrganization } from "@/lib/ensure-organization";

const VALID_WORKSPACE_TYPES = Object.values(WorkspaceType);

const WORKSPACE_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  type: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;
  await ensureDefaultOrganization();

  const { type, limit: rawLimit, offset: rawOffset } = parseSearchParams(req);

  const where: Record<string, unknown> = {
    organizationId: auth.ctx.organizationId,
  };

  if (type) {
    if (!VALID_WORKSPACE_TYPES.includes(type as WorkspaceType)) {
      return errorResponse(
        `Invalid type. Must be one of: ${VALID_WORKSPACE_TYPES.join(", ")}`,
        400
      );
    }
    where.type = type as WorkspaceType;
  }

  const limit = rawLimit ? parseInt(rawLimit, 10) : 50;
  const offset = rawOffset ? parseInt(rawOffset, 10) : 0;

  try {
    const [results, total] = await Promise.all([
      prisma.workspace.findMany({
        where,
        take: limit,
        skip: offset,
        select: WORKSPACE_SELECT,
      }),
      prisma.workspace.count({ where }),
    ]);

    return jsonResponse({ data: results, meta: { total, limit, offset } });
  } catch (err) {
    console.error("[workspaces GET] failed:", err);
    return errorResponse(
      `Failed to list workspaces: ${err instanceof Error ? err.message : "unknown"}`,
      500
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;
  await ensureDefaultOrganization();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { name, slug, type, description, templateId } = body as {
    name?: string;
    slug?: string;
    type?: string;
    description?: string;
    templateId?: string;
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

  // Step 1: create the workspace with explicit select to avoid schema-drift issues
  let workspace: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    type: WorkspaceType;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
  };

  try {
    workspace = await prisma.workspace.create({
      data: {
        organizationId: auth.ctx.organizationId,
        name: name!,
        slug: slug!,
        type: type as WorkspaceType,
        description: description || null,
      },
      select: WORKSPACE_SELECT,
    });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    console.error("[workspaces POST] create failed:", e);
    if (err.code === "P2002") {
      return errorResponse(
        `Workspace with slug "${slug}" already exists`,
        409
      );
    }
    if (err.code === "P2003") {
      return errorResponse(
        `Organization "${auth.ctx.organizationId}" not found. Ensure it exists before creating workspaces.`,
        422
      );
    }
    return errorResponse(
      `Failed to create workspace: ${err.message ?? "unknown database error"}`,
      500
    );
  }

  // Step 2: optional template application
  let templateWarning: string | undefined;
  if (templateId) {
    const tpl = getWorkspaceTemplate(templateId);
    if (!tpl) {
      return errorResponse(
        `Unknown templateId. Use GET /api/v1/workspaces/templates for options.`,
        400,
        { templateId }
      );
    }
    try {
      await applyWorkspaceTemplate(prisma, {
        organizationId: auth.ctx.organizationId,
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
        workspaceName: workspace.name,
        templateId: tpl.id,
      });
    } catch (te) {
      console.error("[workspaces POST] template failed:", te);
      templateWarning = `Template "${templateId}" partially failed: ${te instanceof Error ? te.message : String(te)}. Workspace was created but may be missing departments/agents/tasks.`;
    }
  }

  // Step 3: try to enrich with counts, but never fail the whole request over it
  let responseData: Record<string, unknown> = { ...workspace };
  try {
    const enriched = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      select: {
        ...WORKSPACE_SELECT,
        _count: {
          select: {
            departments: true,
            agents: true,
            projects: true,
            tasks: true,
          },
        },
      },
    });
    if (enriched) {
      responseData = { ...enriched };
    }
  } catch (countErr) {
    console.error("[workspaces POST] count enrichment failed (non-fatal):", countErr);
  }

  if (templateWarning) {
    responseData._templateWarning = templateWarning;
  }

  return jsonResponse({ data: responseData }, 201);
}
