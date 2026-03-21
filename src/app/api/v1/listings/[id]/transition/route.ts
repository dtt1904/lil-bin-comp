import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { ListingStatus, LogLevel } from "@/lib/types";

const VALID_STATUSES = Object.values(ListingStatus);

const FORWARD_TRANSITIONS: Record<ListingStatus, ListingStatus | null> = {
  [ListingStatus.NEW]: ListingStatus.INTAKE,
  [ListingStatus.INTAKE]: ListingStatus.MEDIA_READY,
  [ListingStatus.MEDIA_READY]: ListingStatus.CONTENT_DRAFTING,
  [ListingStatus.CONTENT_DRAFTING]: ListingStatus.REVIEW,
  [ListingStatus.REVIEW]: ListingStatus.PUBLISHED,
  [ListingStatus.PUBLISHED]: null,
  [ListingStatus.ARCHIVED]: null,
};

function isValidTransition(from: ListingStatus, to: ListingStatus): boolean {
  if (to === ListingStatus.ARCHIVED) return true;
  return FORWARD_TRANSITIONS[from] === to;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const listing = store.findById(store.listings, id);
  if (!listing) return errorResponse("Listing not found", 404);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { status } = body as { status?: string };
  if (!status) return errorResponse("status is required", 400);
  if (!VALID_STATUSES.includes(status as ListingStatus)) {
    return errorResponse(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

  const targetStatus = status as ListingStatus;
  if (!isValidTransition(listing.status, targetStatus)) {
    return errorResponse(
      `Invalid transition: ${listing.status} → ${targetStatus}`,
      422
    );
  }

  const now = new Date();
  const oldStatus = listing.status;

  const updated = store.update(store.listings, id, {
    status: targetStatus,
    updatedAt: now,
  });

  store.insert(store.logEvents, {
    id: generateId("log"),
    organizationId: auth.ctx.organizationId,
    workspaceId: listing.workspaceId,
    level: LogLevel.INFO,
    message: `Listing transitioned: ${oldStatus} → ${targetStatus}`,
    metadata: { listingId: id, from: oldStatus, to: targetStatus },
    timestamp: now,
  });

  if (targetStatus === ListingStatus.CONTENT_DRAFTING) {
    const draft = store.insert(store.postDrafts, {
      id: generateId("draft"),
      workspaceId: listing.workspaceId,
      listingId: id,
      platform: "FACEBOOK_PAGE" as never,
      status: "DRAFT" as never,
      caption: `New listing: ${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`,
      mediaUrls: [],
      hashtags: [],
      createdAt: now,
      updatedAt: now,
    });

    store.insert(store.logEvents, {
      id: generateId("log"),
      organizationId: auth.ctx.organizationId,
      workspaceId: listing.workspaceId,
      level: LogLevel.INFO,
      message: `Auto-created draft for listing content drafting`,
      metadata: { listingId: id, draftId: draft.id },
      timestamp: now,
    });
  }

  return jsonResponse({ data: updated });
}
