import { NextRequest } from "next/server";
import { store } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.userId) {
    return errorResponse("userId is required");
  }

  const userNotifications = store.filter(
    store.notifications,
    (n) => n.userId === body.userId && !n.isRead
  );

  let updated = 0;
  for (const notif of userNotifications) {
    store.update(store.notifications, notif.id, { isRead: true });
    updated++;
  }

  return jsonResponse({ data: { updated }, meta: { total: updated } });
}
