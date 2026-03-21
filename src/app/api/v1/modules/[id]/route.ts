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
  const mod = store.findById(store.moduleInstallations, id);
  if (!mod) return errorResponse("Module installation not found", 404);

  return jsonResponse({ data: mod });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.moduleInstallations, id);
  if (!existing) return errorResponse("Module installation not found", 404);

  const body = await req.json();
  const updated = store.update(store.moduleInstallations, id, {
    ...(body.status !== undefined && { status: body.status }),
    ...(body.config !== undefined && { config: body.config }),
    ...(body.version !== undefined && { version: body.version }),
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
  const removed = store.remove(store.moduleInstallations, id);
  if (!removed) return errorResponse("Module installation not found", 404);

  return jsonResponse({ success: true });
}
