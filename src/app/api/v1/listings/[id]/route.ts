import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { ListingStatus, LogLevel } from "@/generated/prisma/enums";

const VALID_STATUSES = Object.values(ListingStatus);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        mediaAssets: { orderBy: { sortOrder: "asc" } },
        postDrafts: { include: { publishedPosts: true } },
        assignedAgent: true,
      },
    });
    if (!listing) return errorResponse("Listing not found", 404);

    return jsonResponse({ data: listing });
  } catch (err) {
    return errorResponse("Failed to fetch listing", 500, {
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

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as ListingStatus)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }
  }

  try {
    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) return errorResponse("Listing not found", 404);

    const data: Record<string, unknown> = {};
    const fieldMap: Record<string, string> = {
      address: "address",
      city: "city",
      state: "state",
      zip: "zipCode",
      mlsNumber: "mlsNumber",
      price: "price",
      bedrooms: "bedrooms",
      bathrooms: "bathrooms",
      sqft: "sqft",
      status: "status",
      agentId: "assignedAgentId",
      description: "description",
      propertyType: "propertyType",
    };

    for (const [bodyField, dbField] of Object.entries(fieldMap)) {
      if (body[bodyField] !== undefined) data[dbField] = body[bodyField];
    }

    const oldStatus = existing.status;
    const updated = await prisma.listing.update({ where: { id }, data });

    if (body.status && body.status !== oldStatus) {
      await prisma.logEvent.create({
        data: {
          organizationId: auth.ctx.organizationId,
          workspaceId: existing.workspaceId,
          level: LogLevel.INFO,
          source: "api",
          message: `Listing status changed: ${oldStatus} → ${body.status}`,
          metadata: { listingId: id, from: oldStatus, to: body.status },
        },
      });
    }

    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse("Failed to update listing", 500, {
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
    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) return errorResponse("Listing not found", 404);

    await prisma.listing.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse("Failed to delete listing", 500, {
      message: (err as Error).message,
    });
  }
}
