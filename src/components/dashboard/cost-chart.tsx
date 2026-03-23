"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, getRenderNowMs } from "@/lib/helpers";

interface CostRecordRow {
  id: string;
  cost: number;
  createdAt: string;
}

interface CostChartProps {
  costRecords: CostRecordRow[];
}

export function CostChart({ costRecords }: CostChartProps) {
  const chartData = useMemo(() => {
    const DAYS = 7;
    const data: { date: string; cost: number }[] = [];
    const base = new Date(getRenderNowMs());

    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(base.getTime());
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86_400_000);

      const total = costRecords
        .filter((c) => {
          const t = new Date(c.createdAt).getTime();
          return t >= dayStart.getTime() && t < dayEnd.getTime();
        })
        .reduce((sum, c) => sum + c.cost, 0);

      data.push({
        date: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        cost: Number(total.toFixed(3)),
      });
    }

    return data;
  }, [costRecords]);

  const totalWeek = chartData.reduce((s, d) => s + d.cost, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Overview</CardTitle>
        <CardDescription>
          {formatCurrency(totalWeek)} total over the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          >
            <defs>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-xl">
                    <p className="text-[11px] text-muted-foreground">
                      {payload[0].payload.date}
                    </p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(payload[0].value as number)}
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="#3b82f6"
              fill="url(#costGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
