import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { ListingStatus, LogLevel } from "@/lib/types";

const VALID_STATUSES = Object.values(ListingStatus);

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const offset = parseInt(params.offset || "0", 10) || 0;

  let results = store.listings;

  if (params.workspaceId) {
    results = store.filter(results, (l) => l.workspaceId === params.workspaceId);
  }
  if (params.status) {
    if (!VALID_STATUSES.includes(params.status as ListingStatus)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }
    results = store.filter(results, (l) => l.status === params.status);
  }
  if (params.agentId) {
    results = store.filter(results, (l) => l.agentId === params.agentId);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    results = store.filter(results, (l) =>
      l.address.toLowerCase().includes(q)
    );
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

  const workspace = store.findById(store.workspaces, workspaceId!);
  if (!workspace) return errorResponse("Workspace not found", 404);

  if (body.agentId) {
    const agent = store.findById(store.agents, body.agentId as string);
    if (!agent) return errorResponse("Agent not found", 404);
  }

  const now = new Date();
  const listing = store.insert(store.listings, {
    id: generateId("listing"),
    workspaceId: workspaceId!,
    address: address!,
    city: city!,
    state: state!,
    zip: zip!,
    mlsNumber: (body.mlsNumber as string) ?? undefined,
    price: (body.price as number) ?? undefined,
    bedrooms: (body.bedrooms as number) ?? undefined,
    bathrooms: (body.bathrooms as number) ?? undefined,
    sqft: (body.sqft as number) ?? undefined,
    status: ListingStatus.NEW,
    agentId: (body.agentId as string) ?? undefined,
    description: (body.description as string) ?? undefined,
    notes: (body.notes as string) ?? undefined,
    createdAt: now,
    updatedAt: now,
  });

  store.insert(store.logEvents, {
    id: generateId("log"),
    organizationId: auth.ctx.organizationId,
    workspaceId: listing.workspaceId,
    level: LogLevel.INFO,
    message: `Listing created: ${listing.address}, ${listing.city}`,
    metadata: { listingId: listing.id },
    timestamp: now,
  });

  return jsonResponse({ data: listing }, 201);
}
