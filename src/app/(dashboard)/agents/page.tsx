export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { AgentsPageClient } from "@/components/agents/agents-page-client";

export default async function AgentsPage() {
  const agentsP = prisma.agent.findMany({
    orderBy: { name: "asc" },
    include: {
      workspace: { select: { name: true } },
      assignedTasks: {
        where: { status: "RUNNING" },
        take: 1,
        select: { title: true },
      },
    },
  });
  const workspacesP = prisma.workspace.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const [agents, workspaces] = await Promise.all([
    agentsP.catch((err) => {
      console.error("[agents] agents query failed:", err);
      return [] as Awaited<typeof agentsP>;
    }),
    workspacesP.catch((err) => {
      console.error("[agents] workspaces query failed:", err);
      return [] as Awaited<typeof workspacesP>;
    }),
  ]);

  const serializedAgents = agents.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    description: a.description,
    status: a.status,
    provider: a.provider,
    model: a.model,
    workspaceName: a.workspace?.name ?? null,
    currentTaskTitle: a.assignedTasks[0]?.title ?? null,
  }));

  return (
    <AgentsPageClient
      agents={serializedAgents}
      workspaces={workspaces}
      totalAgentCount={agents.length}
    />
  );
}
