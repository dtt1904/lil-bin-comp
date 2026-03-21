import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { ListingStatus, LogLevel } from "@/lib/types";

const VALID_STATUSES = Object.values(ListingStatus);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const listing = store.findById(store.listings, id);
  if (!listing) return errorResponse("Listing not found", 404);

  const mediaAssets = store.filter(
    store.mediaAssets,
    (m) => m.listingId === id
  );
  const postDrafts = store.filter(
    store.postDrafts,
    (d) => d.listingId === id
  );
  const publishedPosts = postDrafts.flatMap((draft) =>
    store.filter(store.publishedPosts, (p) => p.postDraftId === draft.id)
  );

  return jsonResponse({
    data: { ...listing, mediaAssets, postDrafts, publishedPosts },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.listings, id);
  if (!existing) return errorResponse("Listing not found", 404);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as ListingStatus)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }
  }

  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };
  const allowedFields = [
    "address", "city", "state", "zip", "mlsNumber", "price",
    "bedrooms", "bathrooms", "sqft", "status", "agentId",
    "assignedToUserId", "description", "notes",
  ];
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const oldStatus = existing.status;
  const updated = store.update(store.listings, id, updates);

  if (body.status && body.status !== oldStatus) {
    store.insert(store.logEvents, {
      id: generateId("log"),
      organizationId: auth.ctx.organizationId,
      workspaceId: existing.workspaceId,
      level: LogLevel.INFO,
      message: `Listing status changed: ${oldStatus} → ${body.status}`,
      metadata: { listingId: id, from: oldStatus, to: body.status },
      timestamp: now,
    });
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
  const existing = store.findById(store.listings, id);
  if (!existing) return errorResponse("Listing not found", 404);

  const mediaToRemove = store.filter(store.mediaAssets, (m) => m.listingId === id);
  for (const media of mediaToRemove) {
    store.remove(store.mediaAssets, media.id);
  }

  const draftsToRemove = store.filter(store.postDrafts, (d) => d.listingId === id);
  for (const draft of draftsToRemove) {
    store.remove(store.postDrafts, draft.id);
  }

  store.remove(store.listings, id);
  return jsonResponse({ success: true });
}
