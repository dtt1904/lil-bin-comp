import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { MediaAssetType } from "@/generated/prisma/enums";

const VALID_TYPES = Object.values(MediaAssetType);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) return errorResponse("Media asset not found", 404);

    return jsonResponse({ data: asset });
  } catch (err) {
    return errorResponse("Failed to fetch media asset", 500, {
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

  if (
    body.type !== undefined &&
    !VALID_TYPES.includes(body.type as MediaAssetType)
  ) {
    return errorResponse(
      `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
      400
    );
  }

  try {
    const existing = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!existing) return errorResponse("Media asset not found", 404);

    const data: Record<string, unknown> = {};
    if (body.type !== undefined) data.type = body.type;
    if (body.url !== undefined) data.fileUrl = body.url;
    if (body.fileName !== undefined) data.name = body.fileName;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.thumbnailUrl !== undefined) data.thumbnailUrl = body.thumbnailUrl;

    const updated = await prisma.mediaAsset.update({ where: { id }, data });
    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse("Failed to update media asset", 500, {
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
    const existing = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!existing) return errorResponse("Media asset not found", 404);

    await prisma.mediaAsset.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse("Failed to delete media asset", 500, {
      message: (err as Error).message,
    });
  }
}
