"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  DollarSign,
  Coins,
  Activity,
  Calculator,
  ArrowUpDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { costRecords, agents, workspaces, taskRuns } from "@/lib/mock-data";
import { TaskRunStatus } from "@/lib/types";
import { formatCurrency, formatRelativeTime } from "@/lib/helpers";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#a855f7",
  "#84cc16",
  "#0ea5e9",
  "#e11d48",
  "#d946ef",
];

function getAgentName(agentId: string) {
  return agents.find((a) => a.id === agentId)?.name ?? agentId;
}

function getWorkspaceName(workspaceId?: string) {
  if (!workspaceId) return "Org-wide";
  return workspaces.find((w) => w.id === workspaceId)?.name ?? workspaceId;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: Record<string, unknown> }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-xl">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

type SortField =
  | "recordedAt"
  | "costUsd"
  | "inputTokens"
  | "outputTokens"
  | "agent"
  | "model";
type SortDir = "asc" | "desc";

export default function AnalyticsPage() {
  const [sortField, setSortField] = useState<SortField>("recordedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const totalSpend = useMemo(
    () => costRecords.reduce((sum, c) => sum + c.costUsd, 0),
    []
  );

  const thisMonthSpend = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return costRecords
      .filter((c) => c.recordedAt >= monthStart)
      .reduce((sum, c) => sum + c.costUsd, 0);
  }, []);

  const totalTokens = useMemo(
    () =>
      costRecords.reduce(
        (sum, c) => sum + c.inputTokens + c.outputTokens,
        0
      ),
    []
  );

  const avgCostPerRun = useMemo(() => {
    const completedRuns = taskRuns.filter(
      (r) => r.status === TaskRunStatus.COMPLETED
    );
    if (completedRuns.length === 0) return 0;
    const totalRunCost = completedRuns.reduce(
      (sum, r) => sum + (r.costUsd ?? 0),
      0
    );
    return totalRunCost / completedRuns.length;
  }, []);

  // Cost over time - last 14 days
  const dailyCostData = useMemo(() => {
    const DAYS = 14;
    const data: { date: string; cost: number }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86_400_000);
      const total = costRecords
        .filter((c) => c.recordedAt >= dayStart && c.recordedAt < dayEnd)
        .reduce((sum, c) => sum + c.costUsd, 0);
      data.push({
        date: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        cost: Number(total.toFixed(4)),
      });
    }
    return data;
  }, []);

  // Cost by agent
  const costByAgent = useMemo(() => {
    const map = new Map<string, number>();
    costRecords.forEach((c) => {
      if (c.agentId) {
        map.set(c.agentId, (map.get(c.agentId) ?? 0) + c.costUsd);
      }
    });
    return Array.from(map.entries())
      .map(([agentId, cost]) => ({
        name: getAgentName(agentId),
        cost: Number(cost.toFixed(4)),
      }))
      .sort((a, b) => b.cost - a.cost);
  }, []);

  // Cost by model/provider
  const costByModel = useMemo(() => {
    const map = new Map<string, number>();
    costRecords.forEach((c) => {
      const key = c.model;
      map.set(key, (map.get(key) ?? 0) + c.costUsd);
    });
    return Array.from(map.entries()).map(([model, cost]) => ({
      name:
        model.length > 18
          ? model.substring(0, 16) + "..."
          : model,
      fullName: model,
      cost: Number(cost.toFixed(4)),
    }));
  }, []);

  // Cost by workspace
  const costByWorkspace = useMemo(() => {
    const map = new Map<string, number>();
    costRecords.forEach((c) => {
      const key = c.workspaceId ?? "org-wide";
      map.set(key, (map.get(key) ?? 0) + c.costUsd);
    });
    return Array.from(map.entries())
      .map(([wsId, cost]) => ({
        name: getWorkspaceName(wsId === "org-wide" ? undefined : wsId),
        cost: Number(cost.toFixed(4)),
      }))
      .sort((a, b) => b.cost - a.cost);
  }, []);

  // Sorted table records
  const sortedRecords = useMemo(() => {
    const sorted = [...costRecords];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "recordedAt":
          cmp = a.recordedAt.getTime() - b.recordedAt.getTime();
          break;
        case "costUsd":
          cmp = a.costUsd - b.costUsd;
          break;
        case "inputTokens":
          cmp = a.inputTokens - b.inputTokens;
          break;
        case "outputTokens":
          cmp = a.outputTokens - b.outputTokens;
          break;
        case "agent":
          cmp = getAgentName(a.agentId ?? "").localeCompare(
            getAgentName(b.agentId ?? "")
          );
          break;
        case "model":
          cmp = a.model.localeCompare(b.model);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortHeader({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) {
    return (
      <TableHead
        className="cursor-pointer select-none hover:text-foreground"
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          <ArrowUpDown
            className={cn(
              "h-3 w-3",
              sortField === field
                ? "text-foreground"
                : "text-muted-foreground/40"
            )}
          />
        </span>
      </TableHead>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cost &amp; Usage Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Token usage, cost breakdowns, and spend analysis across all
          agents
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Total Spend"
          value={formatCurrency(totalSpend)}
          iconClassName="text-emerald-400"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          icon={Coins}
          label="This Month"
          value={formatCurrency(thisMonthSpend)}
          iconClassName="text-blue-400"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          icon={Activity}
          label="Total Tokens"
          value={totalTokens.toLocaleString()}
          iconClassName="text-violet-400"
          iconBgClassName="bg-violet-500/10"
        />
        <StatCard
          icon={Calculator}
          label="Avg Cost / Run"
          value={formatCurrency(avgCostPerRun)}
          iconClassName="text-amber-400"
          iconBgClassName="bg-amber-500/10"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cost Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cost Over Time</CardTitle>
            <CardDescription>Daily spend over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={dailyCostData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="costAreaGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#3b82f6"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="#3b82f6"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#3b82f6"
                  fill="url(#costAreaGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost by Agent */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Agent</CardTitle>
            <CardDescription>
              Total spend per agent across all time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                layout="vertical"
                data={costByAgent}
                margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]} barSize={18}>
                  {costByAgent.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost by Model */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Model</CardTitle>
            <CardDescription>
              Spend distribution across AI models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={costByModel}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  dataKey="cost"
                  nameKey="name"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {costByModel.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as {
                      fullName: string;
                      cost: number;
                    };
                    return (
                      <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-xl">
                        <p className="text-[11px] text-muted-foreground">
                          {d.fullName}
                        </p>
                        <p className="text-sm font-semibold">
                          {formatCurrency(d.cost)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost by Workspace */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cost by Workspace</CardTitle>
            <CardDescription>
              Spend distribution across workspaces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={costByWorkspace}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]} barSize={48}>
                  {costByWorkspace.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Records</CardTitle>
          <CardDescription>
            {costRecords.length} records &middot; click column headers to
            sort
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="recordedAt">Date</SortHeader>
                <SortHeader field="agent">Agent</SortHeader>
                <SortHeader field="model">Model / Provider</SortHeader>
                <SortHeader field="inputTokens">Tokens In</SortHeader>
                <SortHeader field="outputTokens">Tokens Out</SortHeader>
                <SortHeader field="costUsd">Cost</SortHeader>
                <TableHead>Workspace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(record.recordedAt)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {record.agentId
                      ? getAgentName(record.agentId)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{record.model}</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {record.provider}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {record.inputTokens.toLocaleString()}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {record.outputTokens.toLocaleString()}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatCurrency(record.costUsd)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getWorkspaceName(record.workspaceId)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
