export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { TasksPageClient } from "./_client";
import { getDashboardWorkspaceScope } from "@/lib/dashboard-workspace";

function serialize(obj: unknown) {
  return JSON.parse(JSON.stringify(obj));
}

export default async function TasksPage() {
  const { organizationId, workspaceId } = await getDashboardWorkspaceScope();

  const [tasks, workspaces] = await Promise.all([
    prisma.task.findMany({
      where: workspaceId
        ? { organizationId, workspaceId }
        : { organizationId },
      include: {
        assigneeAgent: { select: { id: true, name: true, slug: true } },
        workspace: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspace.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <TasksPageClient
      tasks={serialize(tasks)}
      workspaces={serialize(workspaces)}
    />
  );
}
