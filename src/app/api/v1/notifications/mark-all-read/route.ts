import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.userId) {
    return errorResponse("userId is required");
  }

  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: body.userId,
        read: false,
      },
      data: { read: true },
    });

    return jsonResponse({ data: { updated: result.count }, meta: { total: result.count } });
  } catch (err) {
    return errorResponse(`Failed to mark notifications: ${err instanceof Error ? err.message : err}`, 500);
  }
}
