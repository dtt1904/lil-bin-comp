import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { store } from "@/lib/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const doc = store.findById(store.sopDocuments, id);
  if (!doc) return errorResponse("SOP not found", 404);

  return jsonResponse({ data: doc });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.sopDocuments, id);
  if (!existing) return errorResponse("SOP not found", 404);

  const body = await req.json();

  const contentChanged =
    body.content !== undefined && body.content !== existing.content;

  const updated = store.update(store.sopDocuments, id, {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.content !== undefined && { content: body.content }),
    ...(body.visibility !== undefined && { visibility: body.visibility }),
    ...(contentChanged && { version: existing.version + 1 }),
    updatedAt: new Date(),
  });

  return jsonResponse({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const removed = store.remove(store.sopDocuments, id);
  if (!removed) return errorResponse("SOP not found", 404);

  return jsonResponse({ success: true });
}
