import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { PostDraftStatus, LogLevel } from "@/generated/prisma/enums";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const draft = await prisma.postDraft.findUnique({
      where: { id },
      include: {
        listing: true,
        publishedPosts: true,
      },
    });
    if (!draft) return errorResponse("Draft not found", 404);

    return jsonResponse({ data: draft });
  } catch (err) {
    return errorResponse("Failed to fetch draft", 500, {
      message: (err as Error).message,
    });
  }
}

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
    const existing = await prisma.postDraft.findUnique({ where: { id } });
    if (!existing) return errorResponse("Draft not found", 404);

    const data: Record<string, unknown> = {};
    if (body.caption !== undefined || body.content !== undefined) {
      data.content = (body.content as string) ?? (body.caption as string);
    }
    if (body.title !== undefined) data.title = body.title;
    if (body.platform !== undefined) data.platform = body.platform;
    if (body.status !== undefined) data.status = body.status;
    if (body.scheduledAt !== undefined) {
      data.scheduledAt = new Date(body.scheduledAt as string);
    }
    if (body.reviewedByUserId !== undefined) {
      data.reviewedByUserId = body.reviewedByUserId;
    }

    const oldStatus = existing.status;
    const updated = await prisma.postDraft.update({ where: { id }, data });

    if (body.status && body.status !== oldStatus) {
      if (body.status === PostDraftStatus.APPROVED) {
        await prisma.logEvent.create({
          data: {
            organizationId: auth.ctx.organizationId,
            workspaceId: existing.workspaceId,
            level: LogLevel.INFO,
            source: "api",
            message: `Draft approved`,
            metadata: { draftId: id },
          },
        });
      }

      if (body.status === PostDraftStatus.PUBLISHED) {
        const pub = await prisma.publishedPost.create({
          data: {
            postDraftId: id,
            platform: updated.platform,
            publishedAt: new Date(),
            organizationId: existing.organizationId,
            workspaceId: existing.workspaceId,
          },
        });

        await prisma.logEvent.create({
          data: {
            organizationId: auth.ctx.organizationId,
            workspaceId: existing.workspaceId,
            level: LogLevel.INFO,
            source: "api",
            message: `Draft published, post record created`,
            metadata: { draftId: id, publishedPostId: pub.id },
          },
        });
      }
    }

    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse("Failed to update draft", 500, {
      message: (err as Error).message,
    });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const existing = await prisma.postDraft.findUnique({ where: { id } });
    if (!existing) return errorResponse("Draft not found", 404);

    await prisma.postDraft.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse("Failed to delete draft", 500, {
      message: (err as Error).message,
    });
  }
}
