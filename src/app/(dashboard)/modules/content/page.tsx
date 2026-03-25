export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { ContentPageClient } from "./_client";

export default async function ContentPage() {
  const draftsP = prisma.postDraft.findMany({
    include: {
      listing: { select: { address: true } },
      createdByAgent: { select: { name: true } },
      workspace: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const shareTasksP = prisma.shareTask.findMany({
    include: {
      postDraft: {
        select: {
          content: true,
          workspace: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const workspacesP = prisma.workspace.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const listingsP = prisma.listing.findMany({
    select: { id: true, address: true },
    orderBy: { address: "asc" },
  });

  const [drafts, shareTasks, workspaces, listings] = await Promise.all([
    draftsP.catch((err) => {
      console.error("[modules/content] drafts query failed:", err);
      return [] as Awaited<typeof draftsP>;
    }),
    shareTasksP.catch((err) => {
      console.error("[modules/content] shareTasks query failed:", err);
      return [] as Awaited<typeof shareTasksP>;
    }),
    workspacesP.catch((err) => {
      console.error("[modules/content] workspaces query failed:", err);
      return [] as Awaited<typeof workspacesP>;
    }),
    listingsP.catch((err) => {
      console.error("[modules/content] listings query failed:", err);
      return [] as Awaited<typeof listingsP>;
    }),
  ]);

  return (
    <ContentPageClient
      drafts={JSON.parse(JSON.stringify(drafts))}
      shareTasks={JSON.parse(JSON.stringify(shareTasks))}
      workspaces={JSON.parse(JSON.stringify(workspaces))}
      listings={JSON.parse(JSON.stringify(listings))}
    />
  );
}
