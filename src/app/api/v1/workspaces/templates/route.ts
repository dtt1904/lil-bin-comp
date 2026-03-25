import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { listWorkspaceTemplateSummaries } from "@/lib/workspace-templates";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  try {
    return jsonResponse({ data: listWorkspaceTemplateSummaries() });
  } catch {
    return errorResponse("Failed to list workspace templates", 500);
  }
}
