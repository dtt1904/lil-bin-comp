export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { AnalyticsPageClient } from "./_client";

export default async function AnalyticsPage() {
  const [costRecords, agents, workspaces, taskRuns] = await Promise.all([
    prisma.costRecord.findMany({
      include: {
        agent: { select: { name: true } },
        workspace: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agent.findMany({ select: { id: true, name: true } }),
    prisma.workspace.findMany({ select: { id: true, name: true } }),
    prisma.taskRun.findMany({
      where: { status: "COMPLETED" },
      select: { cost: true },
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
