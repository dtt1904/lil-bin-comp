import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { Visibility } from "@/generated/prisma/enums";

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

    if (q.workspaceId) where.workspaceId = q.workspaceId;
    if (q.visibility) where.visibility = q.visibility as Visibility;
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: "insensitive" } },
        { description: { contains: q.search, mode: "insensitive" } },
        { template: { contains: q.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.promptTemplate.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.promptTemplate.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset } });
  } catch (err) {
    return errorResponse(`Failed to fetch prompts: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.name || !body.template) {
    return errorResponse("name and template are required");
  }

  try {
    const prompt = await prisma.promptTemplate.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: body.workspaceId ?? undefined,
        name: body.name,
        description: body.description ?? undefined,
        template: body.template,
        variables: body.variables ?? [],
        visibility: (body.visibility as Visibility) ?? Visibility.WORKSPACE,
        tags: body.tags ?? [],
      },
    });

    return jsonResponse({ data: prompt }, 201);
  } catch (err) {
    return errorResponse(`Failed to create prompt: ${err instanceof Error ? err.message : err}`, 500);
  }
}
