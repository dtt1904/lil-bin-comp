import type { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/api-auth";

export async function assertWorkspaceInOrganization(
  workspaceId: string,
  organizationId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const ws = await prisma.workspace.findFirst({
    where: { id: workspaceId, organizationId },
    select: { id: true },
  });
  if (!ws) {
    return {
      ok: false,
      response: errorResponse(
        "Workspace not found or does not belong to this organization",
        404
      ),
    };
  }
  return { ok: true };
}
