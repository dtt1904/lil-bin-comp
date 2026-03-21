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
  const prompt = store.findById(store.promptTemplates, id);
  if (!prompt) return errorResponse("Prompt template not found", 404);

  return jsonResponse({ data: prompt });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.promptTemplates, id);
  if (!existing) return errorResponse("Prompt template not found", 404);

  const body = await req.json();
  const updated = store.update(store.promptTemplates, id, {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.template !== undefined && { template: body.template }),
    ...(body.variables !== undefined && { variables: body.variables }),
    ...(body.visibility !== undefined && { visibility: body.visibility }),
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
  const removed = store.remove(store.promptTemplates, id);
  if (!removed) return errorResponse("Prompt template not found", 404);

  return jsonResponse({ success: true });
}
