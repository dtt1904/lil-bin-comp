import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { PostDraftStatus, LogLevel } from "@/lib/types";
import type { PublishedPost } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const draft = store.findById(store.postDrafts, id);
  if (!draft) return errorResponse("Draft not found", 404);

  const listing = draft.listingId
    ? store.findById(store.listings, draft.listingId)
    : null;

  const publishedPosts = store.filter(
    store.publishedPosts,
    (p) => p.postDraftId === id
  );

  return jsonResponse({
    data: { ...draft, listing: listing ?? null, publishedPosts },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.postDrafts, id);
  if (!existing) return errorResponse("Draft not found", 404);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };
  const allowedFields = [
    "caption", "platform", "status", "mediaUrls", "hashtags",
    "scheduledAt", "reviewedByUserId",
  ];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = field === "scheduledAt"
        ? new Date(body[field] as string)
        : body[field];
    }
  }

  const oldStatus = existing.status;
  const updated = store.update(store.postDrafts, id, updates);

  if (body.status && body.status !== oldStatus) {
    if (body.status === PostDraftStatus.APPROVED) {
      store.insert(store.logEvents, {
        id: generateId("log"),
        organizationId: auth.ctx.organizationId,
        workspaceId: existing.workspaceId,
        level: LogLevel.INFO,
        message: `Draft approved`,
        metadata: { draftId: id },
        timestamp: now,
      });
    }

    if (body.status === PostDraftStatus.PUBLISHED) {
      const pub: PublishedPost = {
        id: generateId("pub"),
        postDraftId: id,
        platform: updated!.platform,
        publishedAt: now,
      };
      store.insert(store.publishedPosts, pub);

      store.insert(store.logEvents, {
        id: generateId("log"),
        organizationId: auth.ctx.organizationId,
        workspaceId: existing.workspaceId,
        level: LogLevel.INFO,
        message: `Draft published, post record created`,
        metadata: { draftId: id, publishedPostId: pub.id },
        timestamp: now,
      });
    }
  }

  return jsonResponse({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.postDrafts, id);
  if (!existing) return errorResponse("Draft not found", 404);

  store.remove(store.postDrafts, id);
  return jsonResponse({ success: true });
}
