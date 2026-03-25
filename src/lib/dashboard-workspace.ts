import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/default-organization";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspace-constants";
import { ensureDefaultOrganization } from "@/lib/ensure-organization";

/**
 * Resolves the dashboard scope: cookie if valid for default org, else first workspace in that org.
 */
export async function getDashboardWorkspaceScope(): Promise<{
  organizationId: string;
  workspaceId: string | null;
}> {
  await ensureDefaultOrganization();
  const organizationId = DEFAULT_ORGANIZATION_ID;
  const jar = await cookies();
  const fromCookie = jar.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim();

  if (fromCookie) {
    const valid = await prisma.workspace.findFirst({
      where: { id: fromCookie, organizationId },
      select: { id: true },
    });
    if (valid) {
      return { organizationId, workspaceId: valid.id };
    }
  }

  const first = await prisma.workspace.findFirst({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true },
  });

  return { organizationId, workspaceId: first?.id ?? null };
}
