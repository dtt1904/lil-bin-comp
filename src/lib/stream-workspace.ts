import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * SSE clients pass `workspaceId` as a query param (EventSource cannot set headers).
 */
export function readStreamWorkspaceId(req: NextRequest): string | undefined {
  return req.nextUrl.searchParams.get("workspaceId")?.trim() || undefined;
}

export async function validateStreamWorkspace(
  workspaceId: string | undefined,
  organizationId: string
): Promise<string | undefined> {
  if (!workspaceId) return undefined;
  const row = await prisma.workspace.findFirst({
    where: { id: workspaceId, organizationId },
    select: { id: true },
  });
  return row?.id;
}
