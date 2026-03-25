export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { TasksPageClient } from "./_client";
import { getDashboardWorkspaceScope } from "@/lib/dashboard-workspace";
import { AlertTriangle } from "lucide-react";

function serialize(obj: unknown) {
  return JSON.parse(JSON.stringify(obj));
}

export default async function TasksPage() {
  const { organizationId, workspaceId } = await getDashboardWorkspaceScope();

  let tasks: unknown[] = [];
  let taskError: string | null = null;

  try {
    tasks = await prisma.task.findMany({
      where: workspaceId
        ? { organizationId, workspaceId }
        : { organizationId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        labels: true,
        createdAt: true,
        updatedAt: true,
        workspaceId: true,
        projectId: true,
        assigneeAgentId: true,
        organizationId: true,
        assigneeAgent: { select: { id: true, name: true, slug: true } },
        workspace: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("[tasks-page] query failed:", err);
    taskError =
      err instanceof Error ? err.message : "Unknown error loading tasks";
  }

  let workspaces: { id: string; name: string }[] = [];
  try {
    workspaces = await prisma.workspace.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    console.error("[tasks-page] workspace query failed:", err);
  }

  if (taskError) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track all tasks across your workspace.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-400">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Tasks could not be loaded</p>
            <p className="text-amber-400/80">
              This is usually caused by a pending database migration. The rest
              of the app still works. If you are the deployer, run{" "}
              <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono text-xs">
                prisma migrate deploy
              </code>{" "}
              against the production database.
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-amber-400/60 hover:text-amber-400/80">
                Technical details
              </summary>
              <pre className="mt-1 max-w-full overflow-auto whitespace-pre-wrap rounded bg-black/20 p-2 font-mono text-xs text-amber-400/60">
                {taskError}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TasksPageClient
      tasks={serialize(tasks)}
      workspaces={serialize(workspaces)}
    />
  );
}
