import { NextRequest } from "next/server";
import { store } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { MediaAssetType } from "@/lib/types";

const VALID_TYPES = Object.values(MediaAssetType);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const asset = store.findById(store.mediaAssets, id);
  if (!asset) return errorResponse("Media asset not found", 404);

  return jsonResponse({ data: asset });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.mediaAssets, id);
  if (!existing) return errorResponse("Media asset not found", 404);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (body.type !== undefined && !VALID_TYPES.includes(body.type as MediaAssetType)) {
    return errorResponse(
      `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
      400
    );
  }

  const updates: Record<string, unknown> = {};
  const allowedFields = ["type", "url", "fileName", "sortOrder"];
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const updated = store.update(store.mediaAssets, id, updates);
  return jsonResponse({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.mediaAssets, id);
  if (!existing) return errorResponse("Media asset not found", 404);

  store.remove(store.mediaAssets, id);
  return jsonResponse({ success: true });
}
