import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { PostDraftStatus, PostPlatform, LogLevel } from "@/generated/prisma/enums";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const offset = parseInt(params.offset || "0", 10) || 0;

  try {
    const where: Record<string, unknown> = {};

    if (params.workspaceId) where.workspaceId = params.workspaceId;
    if (params.listingId) where.listingId = params.listingId;
    if (params.platform) where.platform = params.platform as PostPlatform;
    if (params.status) where.status = params.status as PostDraftStatus;

    const [data, total] = await Promise.all([
      prisma.postDraft.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.postDraft.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset } });
  } catch (err) {
    return errorResponse("Failed to fetch drafts", 500, {
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

  const { workspaceId, platform, caption, title } = body as {
    workspaceId?: string;
    platform?: string;
    caption?: string;
    title?: string;
  };

  const missing: string[] = [];
  if (!workspaceId) missing.push("workspaceId");
  if (!platform) missing.push("platform");
  if (!caption && !body.content) missing.push("caption or content");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  if (!Object.values(PostPlatform).includes(platform as PostPlatform)) {
    return errorResponse(
      `Invalid platform. Must be one of: ${Object.values(PostPlatform).join(", ")}`,
      400
    );
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId! },
    });
    if (!workspace) return errorResponse("Workspace not found", 404);

    if (body.listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: body.listingId as string },
      });
      if (!listing) return errorResponse("Listing not found", 404);
    }

    if (body.createdByAgentId) {
      const agent = await prisma.agent.findUnique({
        where: { id: body.createdByAgentId as string },
      });
      if (!agent) return errorResponse("Agent not found", 404);
    }

    const content = (body.content as string) || caption!;

    const draft = await prisma.postDraft.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: workspaceId!,
        listingId: (body.listingId as string) ?? undefined,
        platform: platform as PostPlatform,
        status: (body.status as PostDraftStatus) ?? PostDraftStatus.DRAFT,
        title: title || content.slice(0, 100),
        content,
        scheduledAt: body.scheduledAt
          ? new Date(body.scheduledAt as string)
          : undefined,
        createdByAgentId: (body.createdByAgentId as string) ?? undefined,
      },
    });

    await prisma.logEvent.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: draft.workspaceId,
        level: LogLevel.INFO,
        source: "api",
        message: `Post draft created for ${draft.platform}`,
        metadata: { draftId: draft.id, listingId: draft.listingId },
      },
    });

    return jsonResponse({ data: draft }, 201);
  } catch (err) {
    return errorResponse("Failed to create draft", 500, {
      message: (err as Error).message,
    });
  }
}
