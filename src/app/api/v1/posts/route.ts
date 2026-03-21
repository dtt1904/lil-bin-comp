import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { PostDraftStatus, LogLevel } from "@/lib/types";
import type { PublishedPost } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);

  let results = store.publishedPosts;

  if (params.workspaceId) {
    const draftIds = new Set(
      store.filter(store.postDrafts, (d) => d.workspaceId === params.workspaceId)
        .map((d) => d.id)
    );
    results = store.filter(results, (p) => draftIds.has(p.postDraftId));
  }
  if (params.platform) {
    results = store.filter(results, (p) => p.platform === params.platform);
  }

  const total = results.length;
  const data = results.slice(0, limit);

  return jsonResponse({ data, meta: { total, limit, offset: 0 } });
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

  const draft = store.findById(store.postDrafts, postDraftId!);
  if (!draft) return errorResponse("Post draft not found", 404);

  const now = new Date();
  const post: PublishedPost = {
    id: generateId("pub"),
    postDraftId: postDraftId!,
    platform: platform as PublishedPost["platform"],
    platformPostId: (body.platformPostId as string) ?? undefined,
    publishedAt: now,
    url: (body.url as string) ?? undefined,
    impressions: (body.impressions as number) ?? undefined,
    engagements: (body.engagements as number) ?? undefined,
  };

  store.insert(store.publishedPosts, post);

  store.update(store.postDrafts, postDraftId!, {
    status: PostDraftStatus.PUBLISHED,
    updatedAt: now,
  });

  store.insert(store.logEvents, {
    id: generateId("log"),
    organizationId: auth.ctx.organizationId,
    workspaceId: draft.workspaceId,
    level: LogLevel.INFO,
    message: `Post published on ${platform}`,
    metadata: { publishedPostId: post.id, draftId: postDraftId },
    timestamp: now,
  });

  return jsonResponse({ data: post }, 201);
}
