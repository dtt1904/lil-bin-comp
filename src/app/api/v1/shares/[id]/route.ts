import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { ShareTaskStatus, LogLevel } from "@/generated/prisma/enums";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  try {
    const existing = await prisma.shareTask.findUnique({ where: { id } });
    if (!existing) return errorResponse("Share task not found", 404);

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;

    if (body.status === ShareTaskStatus.SHARED) {
      data.sharedAt = body.sharedAt
        ? new Date(body.sharedAt as string)
        : new Date();
    } else if (body.sharedAt !== undefined) {
      data.sharedAt = new Date(body.sharedAt as string);
    }

    const updated = await prisma.shareTask.update({ where: { id }, data });

    if (body.status) {
      await prisma.logEvent.create({
        data: {
          organizationId: existing.organizationId,
          workspaceId: existing.workspaceId,
          level:
            body.status === ShareTaskStatus.FAILED
              ? LogLevel.ERROR
              : LogLevel.INFO,
          source: "api",
          message: `Share task ${body.status}: ${existing.platform}`,
          metadata: {
            shareTaskId: id,
            platform: existing.platform,
            status: body.status,
          },
        },
      });
    }

    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse("Failed to update share task", 500, {
      message: (err as Error).message,
    });
  }
}
