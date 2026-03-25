export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { AnalyticsPageClient } from "./_client";

export default async function AnalyticsPage() {
  const costRecordsP = prisma.costRecord.findMany({
    include: {
      agent: { select: { name: true } },
      workspace: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const agentsP = prisma.agent.findMany({ select: { id: true, name: true } });
  const workspacesP = prisma.workspace.findMany({ select: { id: true, name: true } });
  const taskRunsP = prisma.taskRun.findMany({
    where: { status: "COMPLETED" },
    select: { cost: true },
  });

  const [costRecords, agents, workspaces, taskRuns] = await Promise.all([
    costRecordsP.catch((err) => {
      console.error("[analytics] costRecords query failed:", err);
      return [] as Awaited<typeof costRecordsP>;
    }),
    agentsP.catch((err) => {
      console.error("[analytics] agents query failed:", err);
      return [] as Awaited<typeof agentsP>;
    }),
    workspacesP.catch((err) => {
      console.error("[analytics] workspaces query failed:", err);
      return [] as Awaited<typeof workspacesP>;
    }),
    taskRunsP.catch((err) => {
      console.error("[analytics] taskRuns query failed:", err);
      return [] as Awaited<typeof taskRunsP>;
    }),
  ]);

  const completedRunCosts = taskRuns.filter((r) => r.cost != null);
  const avgCostPerRun =
    completedRunCosts.length > 0
      ? completedRunCosts.reduce((sum, r) => sum + (r.cost ?? 0), 0) /
        completedRunCosts.length
      : 0;

  return (
    <AnalyticsPageClient
      costRecords={JSON.parse(JSON.stringify(costRecords))}
      agents={JSON.parse(JSON.stringify(agents))}
      workspaces={JSON.parse(JSON.stringify(workspaces))}
      avgCostPerRun={avgCostPerRun}
    />
  );
}
