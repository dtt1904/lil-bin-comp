export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { ActiveTasksTable } from "@/components/dashboard/active-tasks-table";
import { AgentStatusPanel } from "@/components/dashboard/agent-status-panel";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { CostChart } from "@/components/dashboard/cost-chart";
import { LiveOverview } from "@/components/dashboard/live-overview";
import { getDashboardWorkspaceScope } from "@/lib/dashboard-workspace";
import Link from "next/link";
import {
  AgentStatus,
  ApprovalStatus,
  TaskRunStatus,
  TaskStatus,
} from "@/generated/prisma/enums";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("[command-center] query failed:", err);
    return fallback;
  }
}

export default async function CommandCenter() {
  const { organizationId, workspaceId } = await getDashboardWorkspaceScope();

  if (!workspaceId) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Command Center
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          lil_Bin is workspace-first: each client, company, fanpage, or business
          unit should be its own workspace. Create one, then pick it in the sidebar
          switcher to scope tasks, agents, and costs to that client.
        </p>
        <Link
          href="/workspaces"
          className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Go to Workspaces
        </Link>
      </div>
    );
  }

  const workspace = await safe(
    () =>
      prisma.workspace.findFirst({
        where: { id: workspaceId, organizationId },
        select: { name: true, slug: true, type: true },
      }),
    null
  );

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const org = organizationId;
  const ws = workspaceId;

  const [activeTaskCount, pendingApprovalCount, activeAgentCount, totalAgentCount] =
    await Promise.all([
      safe(
        () =>
          prisma.task.count({
            where: {
              organizationId: org,
              workspaceId: ws,
              status: { in: [TaskStatus.RUNNING, TaskStatus.QUEUED] },
            },
          }),
        0
      ),
      safe(
        () =>
          prisma.approval.count({
            where: {
              status: ApprovalStatus.PENDING,
              requestedBy: { organizationId: org },
              task: { workspaceId: ws },
            },
          }),
        0
      ),
      safe(
        () =>
          prisma.agent.count({
            where: {
              organizationId: org,
              workspaceId: ws,
              status: { in: [AgentStatus.ONLINE, AgentStatus.BUSY] },
            },
          }),
        0
      ),
      safe(
        () =>
          prisma.agent.count({
            where: { organizationId: org, workspaceId: ws },
          }),
        0
      ),
    ]);

  type ActiveTask = {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    updatedAt: Date;
    workspace: { name: string } | null;
    assigneeAgent: { name: string } | null;
  };
  type ApprovalRow = {
    id: string;
    title: string;
    description: string | null;
    severity: string;
    createdAt: Date;
    requestedBy: { name: string } | null;
    task: { title: string; priority: string } | null;
  };

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3_600_000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [todayCostAgg, activeTasks, pendingApprovals] = await Promise.all([
    safe(
      () =>
        prisma.costRecord.aggregate({
          _sum: { cost: true },
          where: {
            organizationId: org,
            workspaceId: ws,
            createdAt: { gte: todayStart },
          },
        }),
      { _sum: { cost: null } }
    ),
    safe<ActiveTask[]>(
      () =>
        prisma.task.findMany({
          where: {
            organizationId: org,
            workspaceId: ws,
            status: {
              in: [TaskStatus.RUNNING, TaskStatus.QUEUED, TaskStatus.BLOCKED],
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            updatedAt: true,
            assigneeAgent: { select: { name: true } },
            workspace: { select: { name: true } },
          },
        }),
      []
    ),
    safe<ApprovalRow[]>(
      () =>
        prisma.approval.findMany({
          where: {
            status: ApprovalStatus.PENDING,
            requestedBy: { organizationId: org },
            task: { workspaceId: ws },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: {
            requestedBy: { select: { name: true } },
            task: { select: { title: true, priority: true } },
          },
        }),
      []
    ),
  ]);

  const runTaskScope = { organizationId: org, workspaceId: ws };

  type AgentRow = {
    id: string;
    name: string;
    status: string;
    assignedTasks: { title: string }[];
  };
  type LogRow = {
    id: string;
    level: string;
    message: string;
    createdAt: Date;
    agent: { name: string } | null;
  };
  type CostRow = { id: string; cost: number; createdAt: Date };
  type RunRow = {
    id: string;
    taskId: string;
    runnerId: string | null;
    status: string;
    error: string | null;
    startedAt: Date;
    completedAt: Date | null;
  };

  const [agents, recentLogs, costRecords, recentRuns, runsCompletedLastHour, runsFailedLastHour] =
    await Promise.all([
      safe<AgentRow[]>(
        () =>
          prisma.agent.findMany({
            where: { organizationId: org, workspaceId: ws },
            orderBy: { name: "asc" },
            include: {
              assignedTasks: {
                where: { status: TaskStatus.RUNNING },
                take: 1,
                select: { title: true },
              },
            },
          }),
        []
      ),
      safe<LogRow[]>(
        () =>
          prisma.logEvent.findMany({
            where: {
              organizationId: org,
              OR: [
                { workspaceId: ws },
                { task: { workspaceId: ws } },
                { agent: { workspaceId: ws } },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 8,
            include: { agent: { select: { name: true } } },
          }),
        []
      ),
      safe<CostRow[]>(
        () =>
          prisma.costRecord.findMany({
            where: {
              organizationId: org,
              workspaceId: ws,
            createdAt: { gte: oneWeekAgo },
            },
            select: { id: true, cost: true, createdAt: true },
          }),
        []
      ),
      safe<RunRow[]>(
        () =>
          prisma.taskRun.findMany({
            where: { task: runTaskScope },
            orderBy: { startedAt: "desc" },
            take: 8,
            select: {
              id: true,
              taskId: true,
              runnerId: true,
              status: true,
              error: true,
              startedAt: true,
              completedAt: true,
            },
          }),
        []
      ),
      safe(
        () =>
          prisma.taskRun.count({
            where: {
              task: runTaskScope,
              status: TaskRunStatus.COMPLETED,
              completedAt: { gte: oneHourAgo },
            },
          }),
        0
      ),
      safe(
        () =>
          prisma.taskRun.count({
            where: {
              task: runTaskScope,
              status: { in: [TaskRunStatus.FAILED, TaskRunStatus.CANCELLED] },
              completedAt: { gte: oneHourAgo },
            },
          }),
        0
      ),
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

  const serializedRuns = recentRuns.map((r) => ({
    id: r.id,
    taskId: r.taskId,
    runnerId: r.runnerId,
    status: r.status,
    error: r.error,
    startedAt: r.startedAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  }));

  const scopeLabel = workspace
    ? `${workspace.name} (${workspace.type})`
    : "this workspace";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Command Center
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Scoped to <span className="font-medium text-foreground">{scopeLabel}</span>
            {workspace ? (
              <span className="text-muted-foreground"> · {workspace.slug}</span>
            ) : null}
            . Switch workspace in the sidebar for another client.
          </p>
        </div>

        <LiveOverview
          initialStats={{
            activeTaskCount,
            pendingApprovalCount,
            activeAgentCount,
            totalAgentCount,
            todayCost,
          }}
          initialRunner={{
            completedLastHour: runsCompletedLastHour,
            failedLastHour: runsFailedLastHour,
            runs: serializedRuns,
          }}
        />

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

        <div className="mb-6 grid grid-cols-1 gap-4 sm:gap-6">
          <CostChart costRecords={serializedCosts} />
        </div>
      </div>
    </div>
  );
}
