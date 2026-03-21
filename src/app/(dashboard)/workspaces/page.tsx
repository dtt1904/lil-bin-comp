export const dynamic = "force-dynamic";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";

export default async function WorkspacesPage() {
  const workspaces = await prisma.workspace.findMany({
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
            Manage your workspaces and their resources
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Create Workspace
        </Button>
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
