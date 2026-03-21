import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { Severity } from "@/generated/prisma/enums";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const offset = parseInt(params.offset || "0", 10) || 0;

  try {
    const where: Record<string, unknown> = {
      organizationId: auth.ctx.organizationId,
    };

    if (params.userId) where.userId = params.userId;
    if (params.isRead !== undefined) where.read = params.isRead === "true";
    if (params.severity) where.severity = params.severity as Severity;

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset } });
  } catch (err) {
    return errorResponse(`Failed to fetch notifications: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.userId || !body.title || !body.message) {
    return errorResponse("userId, title, and message are required");
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) return errorResponse("User not found", 404);

    const notification = await prisma.notification.create({
      data: {
        type: body.type ?? "general",
        userId: body.userId,
        organizationId: auth.ctx.organizationId,
        workspaceId: body.workspaceId ?? undefined,
        title: body.title,
        message: body.message,
        severity: (body.severity as Severity) ?? Severity.MEDIUM,
        link: body.linkUrl ?? undefined,
      },
    });

    return jsonResponse({ data: notification }, 201);
  } catch (err) {
    return errorResponse(`Failed to create notification: ${err instanceof Error ? err.message : err}`, 500);
  }
}
