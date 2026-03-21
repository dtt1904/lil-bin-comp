import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { LogLevel } from "@/lib/types";

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (body.confirm !== true) {
    return errorResponse("Must send { confirm: true } to reset store", 400);
  }

  store.reset();

  store.insert(store.logEvents, {
    id: generateId("log"),
    organizationId: auth.ctx.organizationId,
    level: LogLevel.WARN,
    message: "Store reset to initial seed data",
    timestamp: new Date(),
  });

  return jsonResponse({ success: true, message: "Store reset to initial seed data" });
}
