import type { NextRequest } from "next/server";
import { ACTIVE_WORKSPACE_HEADER } from "@/lib/workspace-constants";

/**
 * Active workspace from explicit query param or header (header wins if both set — callers merge with param first).
 */
export function readOptionalWorkspaceId(req: NextRequest): string | undefined {
  const header = req.headers.get(ACTIVE_WORKSPACE_HEADER)?.trim();
  if (header) return header;
  const q = req.nextUrl.searchParams.get("workspaceId")?.trim();
  return q || undefined;
}

/**
 * Effective workspace for list APIs: explicit `workspaceId` query overrides header.
 */
export function effectiveWorkspaceId(
  req: NextRequest,
  paramWorkspaceId?: string | null
): string | undefined {
  const p = paramWorkspaceId?.trim();
  if (p) return p;
  return readOptionalWorkspaceId(req);
}
