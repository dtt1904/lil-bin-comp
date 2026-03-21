import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { PostDraftStatus, LogLevel } from "@/generated/prisma/enums";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);

  try {
    const where: Record<string, unknown> = {};

    if (params.workspaceId) where.workspaceId = params.workspaceId;
    if (params.platform) where.platform = params.platform;

    const [data, total] = await Promise.all([
      prisma.publishedPost.findMany({
        where,
        take: limit,
        orderBy: { publishedAt: "desc" },
      }),
      prisma.publishedPost.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset: 0 } });
  } catch (err) {
    return errorResponse("Failed to fetch published posts", 500, {
      message: (err as Error).message,
    });
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

  const { postDraftId, platform } = body as {
    postDraftId?: string;
    platform?: string;
  };

  const missing: string[] = [];
  if (!postDraftId) missing.push("postDraftId");
  if (!platform) missing.push("platform");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  try {
    const draft = await prisma.postDraft.findUnique({
      where: { id: postDraftId! },
    });
    if (!draft) return errorResponse("Post draft not found", 404);

    const now = new Date();

    const post = await prisma.publishedPost.create({
      data: {
        postDraftId: postDraftId!,
        platform: platform!,
        externalPostId: (body.platformPostId as string) ?? undefined,
        publishedAt: now,
        url: (body.url as string) ?? undefined,
        metrics: body.impressions || body.engagements
          ? {
              impressions: body.impressions ?? null,
              engagements: body.engagements ?? null,
            }
          : undefined,
        organizationId: draft.organizationId,
        workspaceId: draft.workspaceId,
      },
    });

    await prisma.postDraft.update({
      where: { id: postDraftId! },
      data: { status: PostDraftStatus.PUBLISHED },
    });

    await prisma.logEvent.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: draft.workspaceId,
        level: LogLevel.INFO,
        source: "api",
        message: `Post published on ${platform}`,
        metadata: { publishedPostId: post.id, draftId: postDraftId },
      },
    });

    return jsonResponse({ data: post }, 201);
  } catch (err) {
    return errorResponse("Failed to publish post", 500, {
      message: (err as Error).message,
    });
  }
}
