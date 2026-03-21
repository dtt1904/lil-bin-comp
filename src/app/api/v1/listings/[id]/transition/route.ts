import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { ListingStatus, LogLevel, PostPlatform, PostDraftStatus } from "@/generated/prisma/enums";

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

  try {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return errorResponse("Listing not found", 404);

    const targetStatus = status as ListingStatus;
    if (!isValidTransition(listing.status, targetStatus)) {
      return errorResponse(
        `Invalid transition: ${listing.status} → ${targetStatus}`,
        422
      );
    }

    const oldStatus = listing.status;

    const updated = await prisma.listing.update({
      where: { id },
      data: { status: targetStatus },
    });

    await prisma.logEvent.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: listing.workspaceId,
        level: LogLevel.INFO,
        source: "api",
        message: `Listing transitioned: ${oldStatus} → ${targetStatus}`,
        metadata: { listingId: id, from: oldStatus, to: targetStatus },
      },
    });

    if (targetStatus === ListingStatus.CONTENT_DRAFTING) {
      const draft = await prisma.postDraft.create({
        data: {
          organizationId: auth.ctx.organizationId,
          workspaceId: listing.workspaceId,
          listingId: id,
          platform: PostPlatform.FACEBOOK_PAGE,
          status: PostDraftStatus.DRAFT,
          title: `Listing: ${listing.address}`,
          content: `New listing: ${listing.address}, ${listing.city}, ${listing.state} ${listing.zipCode}`,
        },
      });

      await prisma.logEvent.create({
        data: {
          organizationId: auth.ctx.organizationId,
          workspaceId: listing.workspaceId,
          level: LogLevel.INFO,
          source: "api",
          message: `Auto-created draft for listing content drafting`,
          metadata: { listingId: id, draftId: draft.id },
        },
      });
    }

    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse("Failed to transition listing", 500, {
      message: (err as Error).message,
    });
  }
}
