import { ListChecks, Clock, Bot, DollarSign } from "lucide-react";
import { tasks, approvals, agents, costRecords } from "@/lib/mock-data";
import { TaskStatus, ApprovalStatus, AgentStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/helpers";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActiveTasksTable } from "@/components/dashboard/active-tasks-table";
import { AgentStatusPanel } from "@/components/dashboard/agent-status-panel";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { CostChart } from "@/components/dashboard/cost-chart";

export default function CommandCenter() {
  const activeTaskCount = tasks.filter(
    (t) => t.status === TaskStatus.RUNNING || t.status === TaskStatus.QUEUED
  ).length;

  const pendingApprovalCount = approvals.filter(
    (a) => a.status === ApprovalStatus.PENDING
  ).length;

  const activeAgentCount = agents.filter(
    (a) => a.status === AgentStatus.ONLINE || a.status === AgentStatus.BUSY
  ).length;

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const todayCost = costRecords
    .filter((c) => c.recordedAt >= todayStart)
    .reduce((sum, c) => sum + c.costUsd, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Command Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time overview across all workspaces
          </p>
        </div>

        {/* KPI Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={ListChecks}
            label="Active Tasks"
            value={activeTaskCount}
            iconClassName="text-blue-400"
            iconBgClassName="bg-blue-500/10"
            trend={{ value: 12, positive: true }}
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
            value={activeAgentCount}
            iconClassName="text-emerald-400"
            iconBgClassName="bg-emerald-500/10"
            trend={{ value: 8, positive: true }}
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
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column — 2/3 */}
          <div className="space-y-6 lg:col-span-2">
            <ActiveTasksTable />
            <RecentActivity />
          </div>

          {/* Right Column — 1/3 */}
          <div className="space-y-6">
            <AgentStatusPanel />
            <PendingApprovals />
          </div>
        </div>

        {/* Bottom — Cost Chart */}
        <CostChart />
      </div>
    </div>
  );
}
