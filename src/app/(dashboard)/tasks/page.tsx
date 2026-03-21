export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { TasksPageClient } from "./_client";

function serialize(obj: unknown) {
  return JSON.parse(JSON.stringify(obj));
}

export default async function TasksPage() {
  const [tasks, workspaces] = await Promise.all([
    prisma.task.findMany({
      include: {
        assigneeAgent: { select: { id: true, name: true, slug: true } },
        workspace: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspace.findMany({ select: { id: true, name: true } }),
  ]);

  return (
    <TasksPageClient
      tasks={serialize(tasks)}
      workspaces={serialize(workspaces)}
    />
  );
}
