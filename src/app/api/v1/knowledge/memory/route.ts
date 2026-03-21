import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { MemoryType, Visibility } from "@/generated/prisma/enums";

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
    if (q.agentId) where.ownerAgentId = q.agentId;
    if (q.type) where.type = q.type as MemoryType;
    if (q.visibility) where.visibility = q.visibility as Visibility;
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: "insensitive" } },
        { content: { contains: q.search, mode: "insensitive" } },
      ];
    }
    if (q.tags) {
      const tags = q.tags.split(",").map((t) => t.trim());
      where.tags = { hasSome: tags };
    }

    const [data, total] = await Promise.all([
      prisma.memoryEntry.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.memoryEntry.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset } });
  } catch (err) {
    return errorResponse(`Failed to fetch memory entries: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.title || !body.content || !body.type) {
    return errorResponse("title, content, and type are required");
  }

  if (!Object.values(MemoryType).includes(body.type)) {
    return errorResponse(`Invalid type. Must be one of: ${Object.values(MemoryType).join(", ")}`);
  }

  try {
    const entry = await prisma.memoryEntry.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: body.workspaceId ?? undefined,
        ownerAgentId: body.agentId ?? undefined,
        type: body.type as MemoryType,
        title: body.title,
        content: body.content,
        tags: body.tags ?? [],
        visibility: (body.visibility as Visibility) ?? Visibility.WORKSPACE,
      },
    });

    return jsonResponse({ data: entry }, 201);
  } catch (err) {
    return errorResponse(`Failed to create memory entry: ${err instanceof Error ? err.message : err}`, 500);
  }
}
