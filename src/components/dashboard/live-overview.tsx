"use client";

import { useEffect, useState } from "react";
import { Bot, Clock, DollarSign, ListChecks } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { RunnerActivity } from "@/components/dashboard/runner-activity";
import { formatCurrency } from "@/lib/helpers";
import { streamUrl } from "@/lib/live-stream";
import { api } from "@/lib/api-client";

interface LiveOverviewProps {
  initialStats: {
    activeTaskCount: number;
    pendingApprovalCount: number;
    activeAgentCount: number;
    totalAgentCount: number;
    todayCost: number;
  };
  initialRunner: {
    completedLastHour: number;
    failedLastHour: number;
    runs: {
      id: string;
      taskId: string;
      runnerId: string | null;
      status: string;
      error: string | null;
      startedAt: string;
      completedAt: string | null;
    }[];
  };
}

export function LiveOverview({ initialStats, initialRunner }: LiveOverviewProps) {
  const [stats, setStats] = useState(initialStats);
  const [runner, setRunner] = useState(initialRunner);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      const id = setInterval(async () => {
        const [statsRes, runnerRes] = await Promise.all([
          api("/system/stats"),
          api("/runner/status"),
        ]);

        if (statsRes.ok && statsRes.data) {
          const activity = (statsRes.data as any).activity ?? {};
          setStats((prev) => ({
            ...prev,
            activeTaskCount: activity.runningTasks ?? prev.activeTaskCount,
            pendingApprovalCount: activity.pendingApprovals ?? prev.pendingApprovalCount,
            activeAgentCount: activity.activeAgents ?? prev.activeAgentCount,
          }));
        }

        if (runnerRes.ok && runnerRes.data) {
          const data = runnerRes.data as any;
          setRunner({
            completedLastHour: data.lastHour?.completed ?? 0,
            failedLastHour: data.lastHour?.failed ?? 0,
            runs: (data.recentRuns ?? []).map((r: any) => ({
              ...r,
              startedAt: new Date(r.startedAt).toISOString(),
              completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
            })),
          });
        }
      }, 6000);
      return () => clearInterval(id);
    }

    const statsSource = new EventSource(streamUrl("/dashboard"));
    statsSource.addEventListener("dashboard", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        if (payload?.data) setStats(payload.data);
      } catch {
        // noop
      }
    });

    const runnerSource = new EventSource(streamUrl("/runner"));
    runnerSource.addEventListener("runner", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        if (!payload?.data) return;
        setRunner({
          completedLastHour: payload.data.lastHour?.completed ?? 0,
          failedLastHour: payload.data.lastHour?.failed ?? 0,
          runs: (payload.data.recentRuns ?? []).map((r: any) => ({
            ...r,
            startedAt: new Date(r.startedAt).toISOString(),
            completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
          })),
        });
      } catch {
        // noop
      }
    });

    return () => {
      statsSource.close();
      runnerSource.close();
    };
  }, []);

  return (
    <>
      <div className="mb-6 sm:mb-8 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={ListChecks}
          label="Active Tasks"
          value={stats.activeTaskCount}
          iconClassName="text-blue-400"
          iconBgClassName="bg-blue-500/10"
        />
        <StatCard
          icon={Clock}
          label="Pending Approvals"
          value={stats.pendingApprovalCount}
          iconClassName="text-amber-400"
          iconBgClassName="bg-amber-500/10"
        />
        <StatCard
          icon={Bot}
          label="Active Agents"
          value={`${stats.activeAgentCount}/${stats.totalAgentCount}`}
          iconClassName="text-emerald-400"
          iconBgClassName="bg-emerald-500/10"
        />
        <StatCard
          icon={DollarSign}
          label="Today's Cost"
          value={formatCurrency(stats.todayCost)}
          iconClassName="text-violet-400"
          iconBgClassName="bg-violet-500/10"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <RunnerActivity
          runs={runner.runs}
          completedLastHour={runner.completedLastHour}
          failedLastHour={runner.failedLastHour}
        />
      </div>
    </>
  );
}
