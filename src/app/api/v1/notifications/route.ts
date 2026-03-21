import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { Severity } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const offset = parseInt(params.offset || "0", 10) || 0;

  let results = store.notifications;

  if (params.userId) {
    results = store.filter(results, (n) => n.userId === params.userId);
  }
  if (params.isRead !== undefined) {
    const isRead = params.isRead === "true";
    results = store.filter(results, (n) => n.isRead === isRead);
  }
  if (params.severity) {
    results = store.filter(results, (n) => n.severity === params.severity);
  }

  const total = results.length;
  const data = results.slice(offset, offset + limit);

  return jsonResponse({ data, meta: { total, limit, offset } });
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.userId || !body.title || !body.message) {
    return errorResponse("userId, title, and message are required");
  }

  const user = store.findById(store.users, body.userId);
  if (!user) return errorResponse("User not found", 404);

  const now = new Date();
  const notification = store.insert(store.notifications, {
    id: generateId("notif"),
    userId: body.userId,
    title: body.title,
    message: body.message,
    severity: body.severity ?? Severity.MEDIUM,
    isRead: false,
    linkUrl: body.linkUrl ?? undefined,
    createdAt: now,
  });

  return jsonResponse({ data: notification }, 201);
}
