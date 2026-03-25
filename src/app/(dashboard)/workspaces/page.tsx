export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { CreateWorkspaceModal } from "@/components/forms/create-workspace-modal";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/default-organization";

export default async function WorkspacesPage() {
  const workspaces = await prisma.workspace.findMany({
    where: { organizationId: DEFAULT_ORGANIZATION_ID },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          departments: true,
          agents: true,
          tasks: true,
          projects: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each row is a separate client, fanpage, or business unit. Departments
            live inside a workspace — they are not a substitute for multi-client
            isolation.
          </p>
        </div>
        <CreateWorkspaceModal />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {workspaces.map((ws) => (
          <WorkspaceCard
            key={ws.id}
            workspace={{
              id: ws.id,
              name: ws.name,
              slug: ws.slug,
              description: ws.description,
              type: ws.type,
              createdAt: ws.createdAt.toISOString(),
            }}
            counts={ws._count}
          />
        ))}
      </div>
    </div>
  );
}
