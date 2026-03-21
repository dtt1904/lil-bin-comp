export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { ContentPageClient } from "./_client";

export default async function ContentPage() {
  const [drafts, shareTasks, workspaces, listings] = await Promise.all([
    prisma.postDraft.findMany({
      include: {
        listing: { select: { address: true } },
        createdByAgent: { select: { name: true } },
        workspace: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shareTask.findMany({
      include: {
        postDraft: {
          select: {
            content: true,
            workspace: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspace.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.listing.findMany({
      select: { id: true, address: true },
      orderBy: { address: "asc" },
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
