export const dynamic = "force-dynamic";
import { ListChecks, Clock, Bot, DollarSign } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/helpers";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActiveTasksTable } from "@/components/dashboard/active-tasks-table";
import { AgentStatusPanel } from "@/components/dashboard/agent-status-panel";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { CostChart } from "@/components/dashboard/cost-chart";

export default async function CommandCenter() {
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const [activeTaskCount, pendingApprovalCount, activeAgentCount, totalAgentCount] =
    await Promise.all([
      prisma.task.count({ where: { status: { in: ["RUNNING", "QUEUED"] } } }),
      prisma.approval.count({ where: { status: "PENDING" } }),
      prisma.agent.count({ where: { status: { in: ["ONLINE", "BUSY"] } } }),
      prisma.agent.count(),
    ]);

  const [todayCostAgg, activeTasks, pendingApprovals] = await Promise.all([
    prisma.costRecord.aggregate({
      _sum: { cost: true },
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.task.findMany({
      where: { status: { in: ["RUNNING", "QUEUED", "BLOCKED"] } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        assigneeAgent: { select: { name: true } },
        workspace: { select: { name: true } },
      },
    }),
    prisma.approval.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        requestedBy: { select: { name: true } },
        task: { select: { title: true, priority: true } },
      },
    }),
  ]);

  const [agents, recentLogs, costRecords] = await Promise.all([
    prisma.agent.findMany({
      orderBy: { name: "asc" },
      include: {
        assignedTasks: {
          where: { status: "RUNNING" },
          take: 1,
          select: { title: true },
        },
      },
    }),
    prisma.logEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { agent: { select: { name: true } } },
    }),
    prisma.costRecord.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      select: { id: true, cost: true, createdAt: true },
    }),
  ]);

  const todayCost = todayCostAgg._sum.cost ?? 0;

  const serializedTasks = activeTasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    updatedAt: t.updatedAt.toISOString(),
    workspaceName: t.workspace?.name ?? null,
    assigneeName: t.assigneeAgent?.name ?? null,
  }));

  const serializedApprovals = pendingApprovals.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    severity: a.severity,
    createdAt: a.createdAt.toISOString(),
    requesterName: a.requestedBy?.name ?? null,
    taskTitle: a.task?.title ?? null,
    taskPriority: a.task?.priority ?? null,
  }));

  const serializedAgents = agents.map((a) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    currentTaskTitle: a.assignedTasks[0]?.title ?? null,
  }));

  const serializedLogs = recentLogs.map((l) => ({
    id: l.id,
    level: l.level,
    message: l.message,
    createdAt: l.createdAt.toISOString(),
    agentName: l.agent?.name ?? null,
  }));

  const serializedCosts = costRecords.map((c) => ({
    id: c.id,
    cost: c.cost,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Command Center
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Real-time overview across all workspaces
          </p>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 sm:mb-8 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          <StatCard
            icon={ListChecks}
            label="Active Tasks"
            value={activeTaskCount}
            iconClassName="text-blue-400"
            iconBgClassName="bg-blue-500/10"
          />
          <StatCard
            icon={Clock}
            label="Pending Approvals"
            value={pendingApprovalCount}
            iconClassName="text-amber-400"
            iconBgClassName="bg-amber-500/10"
          />
          <StatCard
            icon={Bot}
            label="Active Agents"
            value={`${activeAgentCount}/${totalAgentCount}`}
            iconClassName="text-emerald-400"
            iconBgClassName="bg-emerald-500/10"
          />
          <StatCard
            icon={DollarSign}
            label="Today's Cost"
            value={formatCurrency(todayCost)}
            iconClassName="text-violet-400"
            iconBgClassName="bg-violet-500/10"
          />
        </div>

        {/* Main Content Grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="space-y-4 sm:space-y-6 lg:col-span-2">
            <ActiveTasksTable tasks={serializedTasks} />
            <RecentActivity logEvents={serializedLogs} />
          </div>
          <div className="space-y-4 sm:space-y-6">
            <AgentStatusPanel agents={serializedAgents} />
            <PendingApprovals approvals={serializedApprovals} />
          </div>
        </div>

        <CostChart costRecords={serializedCosts} />
      </div>
    </div>
  );
}
