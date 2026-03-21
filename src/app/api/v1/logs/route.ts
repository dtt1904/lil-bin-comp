import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { LogLevel } from "@/generated/prisma/enums";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const q = parseSearchParams(req);
  const limit = parseInt(q.limit || "100", 10);
  const offset = parseInt(q.offset || "0", 10);

  try {
    const where: Record<string, unknown> = {
      organizationId: auth.ctx.organizationId,
    };

    if (q.workspaceId) where.workspaceId = q.workspaceId;
    if (q.agentId) where.agentId = q.agentId;
    if (q.taskId) where.taskId = q.taskId;
    if (q.level) where.level = q.level as LogLevel;
    if (q.search) {
      where.message = { contains: q.search, mode: "insensitive" };
    }

    const [data, total] = await Promise.all([
      prisma.logEvent.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.logEvent.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset } });
  } catch (err) {
    return errorResponse(`Failed to fetch logs: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.level || !body.message) {
    return errorResponse("level and message are required");
  }

  if (!Object.values(LogLevel).includes(body.level)) {
    return errorResponse(`Invalid level. Must be one of: ${Object.values(LogLevel).join(", ")}`);
  }

  try {
    const event = await prisma.logEvent.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: body.workspaceId ?? undefined,
        agentId: body.agentId ?? undefined,
        taskId: body.taskId ?? undefined,
        level: body.level as LogLevel,
        source: body.source ?? "api",
        message: body.message,
        metadata: body.metadata ?? undefined,
      },
    });

    return jsonResponse({ data: event }, 201);
  } catch (err) {
    return errorResponse(`Failed to create log: ${err instanceof Error ? err.message : err}`, 500);
  }
}
