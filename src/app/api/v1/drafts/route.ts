import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { PostDraftStatus, PostPlatform, LogLevel } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const offset = parseInt(params.offset || "0", 10) || 0;

  let results = store.postDrafts;

  if (params.workspaceId) {
    results = store.filter(results, (d) => d.workspaceId === params.workspaceId);
  }
  if (params.listingId) {
    results = store.filter(results, (d) => d.listingId === params.listingId);
  }
  if (params.platform) {
    results = store.filter(results, (d) => d.platform === params.platform);
  }
  if (params.status) {
    results = store.filter(results, (d) => d.status === params.status);
  }

  const total = results.length;
  const data = results.slice(offset, offset + limit);

  return jsonResponse({ data, meta: { total, limit, offset } });
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

  const { workspaceId, platform, caption } = body as {
    workspaceId?: string;
    platform?: string;
    caption?: string;
  };

  const missing: string[] = [];
  if (!workspaceId) missing.push("workspaceId");
  if (!platform) missing.push("platform");
  if (!caption) missing.push("caption");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  const workspace = store.findById(store.workspaces, workspaceId!);
  if (!workspace) return errorResponse("Workspace not found", 404);

  if (body.listingId) {
    const listing = store.findById(store.listings, body.listingId as string);
    if (!listing) return errorResponse("Listing not found", 404);
  }

  if (!Object.values(PostPlatform).includes(platform as PostPlatform)) {
    return errorResponse(
      `Invalid platform. Must be one of: ${Object.values(PostPlatform).join(", ")}`,
      400
    );
  }

  if (body.createdByAgentId) {
    const agent = store.findById(store.agents, body.createdByAgentId as string);
    if (!agent) return errorResponse("Agent not found", 404);
  }

  const now = new Date();
  const draft = store.insert(store.postDrafts, {
    id: generateId("draft"),
    workspaceId: workspaceId!,
    listingId: (body.listingId as string) ?? undefined,
    platform: platform as PostPlatform,
    status: (body.status as PostDraftStatus) ?? PostDraftStatus.DRAFT,
    caption: caption!,
    mediaUrls: (body.mediaUrls as string[]) ?? [],
    hashtags: (body.hashtags as string[]) ?? [],
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt as string) : undefined,
    createdByAgentId: (body.createdByAgentId as string) ?? undefined,
    createdAt: now,
    updatedAt: now,
  });

  store.insert(store.logEvents, {
    id: generateId("log"),
    organizationId: auth.ctx.organizationId,
    workspaceId: draft.workspaceId,
    level: LogLevel.INFO,
    message: `Post draft created for ${draft.platform}`,
    metadata: { draftId: draft.id, listingId: draft.listingId },
    timestamp: now,
  });

  return jsonResponse({ data: draft }, 201);
}
