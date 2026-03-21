import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { ListingStatus, LogLevel } from "@/generated/prisma/enums";

const VALID_STATUSES = Object.values(ListingStatus);

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const offset = parseInt(params.offset || "0", 10) || 0;

  try {
    const where: Record<string, unknown> = {};

    if (params.workspaceId) where.workspaceId = params.workspaceId;
    if (params.status) {
      if (!VALID_STATUSES.includes(params.status as ListingStatus)) {
        return errorResponse(
          `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
          400
        );
      }
      where.status = params.status as ListingStatus;
    }
    if (params.agentId) where.assignedAgentId = params.agentId;
    if (params.search) {
      where.address = { contains: params.search, mode: "insensitive" };
    }

    const [data, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.listing.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset } });
  } catch (err) {
    return errorResponse("Failed to fetch listings", 500, {
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

  const { workspaceId, address, city, state, zip } = body as {
    workspaceId?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };

  const missing: string[] = [];
  if (!workspaceId) missing.push("workspaceId");
  if (!address) missing.push("address");
  if (!city) missing.push("city");
  if (!state) missing.push("state");
  if (!zip) missing.push("zip");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId! },
    });
    if (!workspace) return errorResponse("Workspace not found", 404);

    if (body.agentId) {
      const agent = await prisma.agent.findUnique({
        where: { id: body.agentId as string },
      });
      if (!agent) return errorResponse("Agent not found", 404);
    }

    const listing = await prisma.listing.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: workspaceId!,
        address: address!,
        city: city!,
        state: state!,
        zipCode: zip!,
        mlsNumber: (body.mlsNumber as string) ?? undefined,
        price: (body.price as number) ?? undefined,
        bedrooms: (body.bedrooms as number) ?? undefined,
        bathrooms: (body.bathrooms as number) ?? undefined,
        sqft: (body.sqft as number) ?? undefined,
        status: ListingStatus.NEW,
        assignedAgentId: (body.agentId as string) ?? undefined,
        description: (body.description as string) ?? undefined,
      },
    });

    await prisma.logEvent.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: listing.workspaceId,
        level: LogLevel.INFO,
        source: "api",
        message: `Listing created: ${listing.address}, ${listing.city}`,
        metadata: { listingId: listing.id },
      },
    });

    return jsonResponse({ data: listing }, 201);
  } catch (err) {
    return errorResponse("Failed to create listing", 500, {
      message: (err as Error).message,
    });
  }
}
