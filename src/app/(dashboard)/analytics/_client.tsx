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
import {
  formatCurrency,
  formatRelativeTime,
  getRenderNowMs,
} from "@/lib/helpers";
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
  | "createdAt"
  | "cost"
  | "tokensInput"
  | "tokensOutput"
  | "agent"
  | "model";
type SortDir = "asc" | "desc";

interface SerializedCostRecord {
  id: string;
  agentId: string | null;
  workspaceId: string | null;
  provider: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  createdAt: string;
  agent: { name: string } | null;
  workspace: { name: string } | null;
}

interface SerializedAgent {
  id: string;
  name: string;
}

interface SerializedWorkspace {
  id: string;
  name: string;
}

interface AnalyticsPageClientProps {
  costRecords: SerializedCostRecord[];
  agents: SerializedAgent[];
  workspaces: SerializedWorkspace[];
  avgCostPerRun: number;
}

export function AnalyticsPageClient({
  costRecords,
  avgCostPerRun,
}: AnalyticsPageClientProps) {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const totalSpend = useMemo(
    () => costRecords.reduce((sum, c) => sum + c.cost, 0),
    [costRecords]
  );

  const thisMonthSpend = useMemo(() => {
    const now = new Date(getRenderNowMs());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return costRecords
      .filter((c) => new Date(c.createdAt) >= monthStart)
      .reduce((sum, c) => sum + c.cost, 0);
  }, [costRecords]);

  const totalTokens = useMemo(
    () =>
      costRecords.reduce(
        (sum, c) => sum + c.tokensInput + c.tokensOutput,
        0
      ),
    [costRecords]
  );

  const dailyCostData = useMemo(() => {
    const DAYS = 14;
    const data: { date: string; cost: number }[] = [];
    const base = new Date(getRenderNowMs());
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(base.getTime());
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86_400_000);
      const total = costRecords
        .filter((c) => {
          const t = new Date(c.createdAt);
          return t >= dayStart && t < dayEnd;
        })
        .reduce((sum, c) => sum + c.cost, 0);
      data.push({
        date: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        cost: Number(total.toFixed(4)),
      });
    }
    return data;
  }, [costRecords]);

  const costByAgent = useMemo(() => {
    const map = new Map<string, { name: string; cost: number }>();
    costRecords.forEach((c) => {
      if (c.agentId) {
        const existing = map.get(c.agentId);
        if (existing) {
          existing.cost += c.cost;
        } else {
          map.set(c.agentId, {
            name: c.agent?.name ?? c.agentId,
            cost: c.cost,
          });
        }
      }
    });
    return Array.from(map.values())
      .map((v) => ({ name: v.name, cost: Number(v.cost.toFixed(4)) }))
      .sort((a, b) => b.cost - a.cost);
  }, [costRecords]);

  const costByModel = useMemo(() => {
    const map = new Map<string, number>();
    costRecords.forEach((c) => {
      const key = c.model;
      map.set(key, (map.get(key) ?? 0) + c.cost);
    });
    return Array.from(map.entries()).map(([model, cost]) => ({
      name:
        model.length > 18
          ? model.substring(0, 16) + "..."
          : model,
      fullName: model,
      cost: Number(cost.toFixed(4)),
    }));
  }, [costRecords]);

  const costByWorkspace = useMemo(() => {
    const map = new Map<string, { name: string; cost: number }>();
    costRecords.forEach((c) => {
      const key = c.workspaceId ?? "org-wide";
      const existing = map.get(key);
      if (existing) {
        existing.cost += c.cost;
      } else {
        map.set(key, {
          name: c.workspace?.name ?? "Org-wide",
          cost: c.cost,
        });
      }
    });
    return Array.from(map.values())
      .map((v) => ({ name: v.name, cost: Number(v.cost.toFixed(4)) }))
      .sort((a, b) => b.cost - a.cost);
  }, [costRecords]);

  const sortedRecords = useMemo(() => {
    const sorted = [...costRecords];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "createdAt":
          cmp =
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime();
          break;
        case "cost":
          cmp = a.cost - b.cost;
          break;
        case "tokensInput":
          cmp = a.tokensInput - b.tokensInput;
          break;
        case "tokensOutput":
          cmp = a.tokensOutput - b.tokensOutput;
          break;
        case "agent":
          cmp = (a.agent?.name ?? "").localeCompare(b.agent?.name ?? "");
          break;
        case "model":
          cmp = a.model.localeCompare(b.model);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [costRecords, sortField, sortDir]);

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
                <SortHeader field="createdAt">Date</SortHeader>
                <SortHeader field="agent">Agent</SortHeader>
                <SortHeader field="model">Model / Provider</SortHeader>
                <SortHeader field="tokensInput">Tokens In</SortHeader>
                <SortHeader field="tokensOutput">Tokens Out</SortHeader>
                <SortHeader field="cost">Cost</SortHeader>
                <TableHead>Workspace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(new Date(record.createdAt))}
                  </TableCell>
                  <TableCell className="font-medium">
                    {record.agent?.name ?? "—"}
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
                    {record.tokensInput.toLocaleString()}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {record.tokensOutput.toLocaleString()}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatCurrency(record.cost)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {record.workspace?.name ?? "Org-wide"}
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
