import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { MediaAssetType } from "@/generated/prisma/enums";

const VALID_TYPES = Object.values(MediaAssetType);

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);

  try {
    const where: Record<string, unknown> = {};

    if (params.listingId) where.listingId = params.listingId;
    if (params.type) {
      if (!VALID_TYPES.includes(params.type as MediaAssetType)) {
        return errorResponse(
          `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
          400
        );
      }
      where.type = params.type as MediaAssetType;
    }
    if (params.workspaceId) where.workspaceId = params.workspaceId;

    const data = await prisma.mediaAsset.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });

    return jsonResponse({ data, meta: { total: data.length } });
  } catch (err) {
    return errorResponse("Failed to fetch media assets", 500, {
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

  if (!VALID_TYPES.includes(type as MediaAssetType)) {
    return errorResponse(
      `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
      400
    );
  }

  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId! },
    });
    if (!listing) return errorResponse("Listing not found", 404);

    const asset = await prisma.mediaAsset.create({
      data: {
        listingId: listingId!,
        name: fileName!,
        type: type as MediaAssetType,
        fileUrl: url!,
        mimeType: (body.mimeType as string) ?? undefined,
        sizeBytes: (body.sizeBytes as number) ?? undefined,
        sortOrder: (body.sortOrder as number) ?? 0,
        organizationId: listing.organizationId,
        workspaceId: listing.workspaceId,
      },
    });

    return jsonResponse({ data: asset }, 201);
  } catch (err) {
    return errorResponse("Failed to create media asset", 500, {
      message: (err as Error).message,
    });
  }
}
