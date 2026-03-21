import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { ShareTaskStatus, LogLevel } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.shareTasks, id);
  if (!existing) return errorResponse("Share task not found", 404);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.errorMessage !== undefined) updates.errorMessage = body.errorMessage;

  if (body.status === ShareTaskStatus.SHARED) {
    updates.sharedAt = body.sharedAt ? new Date(body.sharedAt as string) : new Date();
  } else if (body.sharedAt !== undefined) {
    updates.sharedAt = new Date(body.sharedAt as string);
  }

  const updated = store.update(store.shareTasks, id, updates);

  if (body.status) {
    const draft = store.findById(store.postDrafts, existing.postDraftId);
    store.insert(store.logEvents, {
      id: generateId("log"),
      organizationId: auth.ctx.organizationId,
      workspaceId: draft?.workspaceId,
      level: body.status === ShareTaskStatus.FAILED ? LogLevel.ERROR : LogLevel.INFO,
      message: `Share task ${body.status}: ${existing.platform}`,
      metadata: { shareTaskId: id, platform: existing.platform, status: body.status },
      timestamp: new Date(),
    });
  }

  return jsonResponse({ data: updated });
}
