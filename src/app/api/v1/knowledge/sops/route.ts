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
        { title: { contains: q.search, mode: "insensitive" } },
        { content: { contains: q.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.sOPDocument.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.sOPDocument.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset } });
  } catch (err) {
    return errorResponse(`Failed to fetch SOPs: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.title || !body.content) {
    return errorResponse("title and content are required");
  }

  try {
    const doc = await prisma.sOPDocument.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: body.workspaceId ?? undefined,
        departmentId: body.departmentId ?? undefined,
        title: body.title,
        content: body.content,
        visibility: (body.visibility as Visibility) ?? Visibility.WORKSPACE,
        tags: body.tags ?? [],
      },
    });

    return jsonResponse({ data: doc }, 201);
  } catch (err) {
    return errorResponse(`Failed to create SOP: ${err instanceof Error ? err.message : err}`, 500);
  }
}
