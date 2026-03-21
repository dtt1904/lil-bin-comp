import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { AgentStatus } from "@/generated/prisma/enums";

const VALID_STATUSES = Object.values(AgentStatus);

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const {
    workspaceId,
    departmentId,
    status,
    limit: rawLimit,
    offset: rawOffset,
  } = parseSearchParams(req);

  const where: Record<string, unknown> = {};
  if (workspaceId) where.workspaceId = workspaceId;
  if (departmentId) where.departmentId = departmentId;
  if (status) {
    if (!VALID_STATUSES.includes(status as AgentStatus)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }
    where.status = status as AgentStatus;
  }

  const limit = rawLimit ? parseInt(rawLimit, 10) : 50;
  const offset = rawOffset ? parseInt(rawOffset, 10) : 0;

  try {
    const [results, total] = await Promise.all([
      prisma.agent.findMany({ where, take: limit, skip: offset }),
      prisma.agent.count({ where }),
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

  const {
    name,
    slug,
    description,
    role,
    workspaceId,
    departmentId,
    model,
    provider,
    systemPrompt,
    status,
    temperature,
    codename,
    avatarUrl,
  } = body as {
    name?: string;
    slug?: string;
    description?: string;
    role?: string;
    workspaceId?: string;
    departmentId?: string;
    model?: string;
    provider?: string;
    systemPrompt?: string;
    status?: string;
    temperature?: number;
    codename?: string;
    avatarUrl?: string;
  };

  const missing: string[] = [];
  if (!name) missing.push("name");
  if (!slug) missing.push("slug");
  if (!model) missing.push("model");
  if (!provider) missing.push("provider");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  if (status && !VALID_STATUSES.includes(status as AgentStatus)) {
    return errorResponse(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

  if (workspaceId) {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
      if (!workspace) {
        return errorResponse(`Workspace "${workspaceId}" not found`, 400, {
          field: "workspaceId",
        });
      }
    } catch {
      return errorResponse("Internal error", 500);
    }
  }

  if (departmentId) {
    try {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        return errorResponse(`Department "${departmentId}" not found`, 400, {
          field: "departmentId",
        });
      }
    } catch {
      return errorResponse("Internal error", 500);
    }
  }

  try {
    const agent = await prisma.agent.create({
      data: {
        organizationId: auth.ctx.organizationId,
        name: name!,
        slug: slug!,
        role: role || "assistant",
        model: model!,
        provider: provider!,
        systemPrompt: systemPrompt ?? "",
        ...(status ? { status: status as AgentStatus } : {}),
        description,
        workspaceId,
        departmentId,
        temperature,
        codename,
        avatarUrl,
      },
    });

    return jsonResponse({ data: agent }, 201);
  } catch (e: any) {
    if (e.code === "P2002") {
      return errorResponse(`Agent with slug "${slug}" already exists`, 409);
    }
    return errorResponse("Internal error", 500);
  }
}
