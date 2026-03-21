import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { ShareTaskStatus } from "@/generated/prisma/enums";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);

  try {
    const where: Record<string, unknown> = {};

    if (params.postDraftId) where.postDraftId = params.postDraftId;
    if (params.status) where.status = params.status as ShareTaskStatus;
    if (params.platform) where.platform = params.platform;

    const data = await prisma.shareTask.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ data, meta: { total: data.length } });
  } catch (err) {
    return errorResponse("Failed to fetch share tasks", 500, {
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

  const { postDraftId, platform, targetGroup } = body as {
    postDraftId?: string;
    platform?: string;
    targetGroup?: string;
  };

  const missing: string[] = [];
  if (!postDraftId) missing.push("postDraftId");
  if (!platform) missing.push("platform");
  if (!targetGroup) missing.push("targetGroup");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  try {
    const draft = await prisma.postDraft.findUnique({
      where: { id: postDraftId! },
    });
    if (!draft) return errorResponse("Post draft not found", 404);

    const task = await prisma.shareTask.create({
      data: {
        postDraftId: postDraftId!,
        platform: platform!,
        targetGroup: targetGroup!,
        status: (body.status as ShareTaskStatus) ?? ShareTaskStatus.PENDING,
        organizationId: draft.organizationId,
        workspaceId: draft.workspaceId,
        assignedAgentId: (body.assignedAgentId as string) ?? undefined,
      },
    });

    return jsonResponse({ data: task }, 201);
  } catch (err) {
    return errorResponse("Failed to create share task", 500, {
      message: (err as Error).message,
    });
  }
}
