export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { ListingsPageClient } from "./_client";

export default async function ListingsPage() {
  const listingsP = prisma.listing.findMany({
    include: {
      assignedAgent: { select: { id: true, name: true } },
      workspace: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const workspacesP = prisma.workspace.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const [listings, workspaces] = await Promise.all([
    listingsP.catch((err) => {
      console.error("[modules/listings] listings query failed:", err);
      return [] as Awaited<typeof listingsP>;
    }),
    workspacesP.catch((err) => {
      console.error("[modules/listings] workspaces query failed:", err);
      return [] as Awaited<typeof workspacesP>;
    }),
  ]);

  return (
    <ListingsPageClient
      listings={JSON.parse(JSON.stringify(listings))}
      workspaces={JSON.parse(JSON.stringify(workspaces))}
    />
  );
}
