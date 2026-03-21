import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { WorkspaceType } from "@/generated/prisma/enums";

const VALID_WORKSPACE_TYPES = Object.values(WorkspaceType);

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { type, limit: rawLimit, offset: rawOffset } = parseSearchParams(req);

  const where: Record<string, unknown> = {};

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
      prisma.workspace.findMany({ where, take: limit, skip: offset }),
      prisma.workspace.count({ where }),
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

  const { name, slug, type, description } = body as {
    name?: string;
    slug?: string;
    type?: string;
    description?: string;
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

  try {
    const workspace = await prisma.workspace.create({
      data: {
        organizationId: auth.ctx.organizationId,
        name: name!,
        slug: slug!,
        type: type as WorkspaceType,
        description,
      },
    });

    return jsonResponse({ data: workspace }, 201);
  } catch (e: any) {
    if (e.code === "P2002") {
      return errorResponse(`Workspace with slug "${slug}" already exists`, 409);
    }
    return errorResponse("Internal error", 500);
  }
}
