import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { MediaAssetType } from "@/lib/types";

const VALID_TYPES = Object.values(MediaAssetType);

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  let results = store.mediaAssets;

  if (params.listingId) {
    results = store.filter(results, (m) => m.listingId === params.listingId);
  }
  if (params.type) {
    if (!VALID_TYPES.includes(params.type as MediaAssetType)) {
      return errorResponse(
        `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
        400
      );
    }
    results = store.filter(results, (m) => m.type === params.type);
  }
  if (params.workspaceId) {
    const listingIds = new Set(
      store.filter(store.listings, (l) => l.workspaceId === params.workspaceId)
        .map((l) => l.id)
    );
    results = store.filter(results, (m) => listingIds.has(m.listingId));
  }

  return jsonResponse({ data: results, meta: { total: results.length } });
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

  const { listingId, type, url, fileName } = body as {
    listingId?: string;
    type?: string;
    url?: string;
    fileName?: string;
  };

  const missing: string[] = [];
  if (!listingId) missing.push("listingId");
  if (!type) missing.push("type");
  if (!url) missing.push("url");
  if (!fileName) missing.push("fileName");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  const listing = store.findById(store.listings, listingId!);
  if (!listing) return errorResponse("Listing not found", 404);

  if (!VALID_TYPES.includes(type as MediaAssetType)) {
    return errorResponse(
      `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
      400
    );
  }

  const now = new Date();
  const asset = store.insert(store.mediaAssets, {
    id: generateId("media"),
    listingId: listingId!,
    type: type as MediaAssetType,
    url: url!,
    fileName: fileName!,
    mimeType: (body.mimeType as string) ?? undefined,
    sizeBytes: (body.sizeBytes as number) ?? undefined,
    sortOrder: (body.sortOrder as number) ?? 0,
    createdAt: now,
  });

  return jsonResponse({ data: asset }, 201);
}
