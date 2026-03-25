export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { CreateWorkspaceModal } from "@/components/forms/create-workspace-modal";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/default-organization";
import { ensureDefaultOrganization } from "@/lib/ensure-organization";
import { AlertTriangle } from "lucide-react";

type WsRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  createdAt: Date;
  _count: { departments: number; agents: number; tasks: number; projects: number };
};

export default async function WorkspacesPage() {
  await ensureDefaultOrganization();
  let workspaces: WsRow[] = [];
  let loadError: string | null = null;

  try {
    workspaces = await prisma.workspace.findMany({
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
  } catch (err) {
    console.error("[workspaces-page] query failed:", err);
    loadError =
      err instanceof Error ? err.message : "Unknown error loading workspaces";
  }

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

      {loadError ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-400">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Workspaces could not be loaded</p>
            <p className="text-amber-400/80">
              This may be caused by a database connection issue or pending
              migration.
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-amber-400/60 hover:text-amber-400/80">
                Technical details
              </summary>
              <pre className="mt-1 max-w-full overflow-auto whitespace-pre-wrap rounded bg-black/20 p-2 font-mono text-xs text-amber-400/60">
                {loadError}
              </pre>
            </details>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
