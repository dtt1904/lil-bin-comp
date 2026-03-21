export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { ListingsPageClient } from "./_client";

export default async function ListingsPage() {
  const [listings, workspaces] = await Promise.all([
    prisma.listing.findMany({
      include: {
        assignedAgent: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspace.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ListingsPageClient
      listings={JSON.parse(JSON.stringify(listings))}
      workspaces={JSON.parse(JSON.stringify(workspaces))}
    />
  );
}
