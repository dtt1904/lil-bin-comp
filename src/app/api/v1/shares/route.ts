import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { ShareTaskStatus } from "@/lib/types";
import type { ShareTask } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  let results = store.shareTasks;

  if (params.postDraftId) {
    results = store.filter(results, (s) => s.postDraftId === params.postDraftId);
  }
  if (params.status) {
    results = store.filter(results, (s) => s.status === params.status);
  }
  if (params.platform) {
    results = store.filter(results, (s) => s.platform === params.platform);
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

  const { postDraftId, platform } = body as {
    postDraftId?: string;
    platform?: string;
  };

  const missing: string[] = [];
  if (!postDraftId) missing.push("postDraftId");
  if (!platform) missing.push("platform");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  const draft = store.findById(store.postDrafts, postDraftId!);
  if (!draft) return errorResponse("Post draft not found", 404);

  const now = new Date();
  const task: ShareTask = {
    id: generateId("share"),
    postDraftId: postDraftId!,
    platform: platform as ShareTask["platform"],
    status: (body.status as ShareTaskStatus) ?? ShareTaskStatus.PENDING,
    createdAt: now,
  };

  store.insert(store.shareTasks, task);
  return jsonResponse({ data: task }, 201);
}
