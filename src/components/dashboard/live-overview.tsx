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

interface DashboardActivityPayload {
  activity?: {
    runningTasks?: number;
    pendingApprovals?: number;
    activeAgents?: number;
  };
}

interface RunnerRunPayload {
  id: string;
  taskId: string;
  runnerId?: string | null;
  status?: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

interface RunnerStatusPayload {
  lastHour?: {
    completed?: number;
    failed?: number;
  };
  recentRuns?: RunnerRunPayload[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function normalizeRuns(runs: unknown): {
  id: string;
  taskId: string;
  runnerId: string | null;
  status: string;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}[] {
  if (!Array.isArray(runs)) return [];
  return runs
    .map((run): LiveOverviewProps["initialRunner"]["runs"][number] | null => {
      if (!isRecord(run)) return null;

      const id = run.id;
      const taskId = run.taskId;
      const status = run.status;
      const startedAt = run.startedAt;
      const completedAt = run.completedAt;
      const error = run.error;
      const runnerId = "runnerId" in run ? run.runnerId : null;

      if (
        typeof id !== "string" ||
        typeof taskId !== "string" ||
        typeof status !== "string" ||
        typeof startedAt !== "string"
      ) {
        return null;
      }

      return {
        id,
        taskId,
        runnerId:
          typeof runnerId === "string" ? runnerId : runnerId === null ? null : null,
        status,
        error:
          typeof error === "string" || error === null
            ? error
            : null,
        startedAt: new Date(startedAt).toISOString(),
        completedAt:
          typeof completedAt === "string"
            ? new Date(completedAt).toISOString()
            : null,
      };
    })
    .filter((run): run is LiveOverviewProps["initialRunner"]["runs"][number] => run !== null);
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
          const payload = isRecord(statsRes.data)
            ? (statsRes.data as DashboardActivityPayload)
            : {};
          const activity = payload.activity ?? {};
          setStats((prev) => ({
            ...prev,
            activeTaskCount:
              toNumber(activity.runningTasks) ?? prev.activeTaskCount,
            pendingApprovalCount:
              toNumber(activity.pendingApprovals) ?? prev.pendingApprovalCount,
            activeAgentCount:
              toNumber(activity.activeAgents) ?? prev.activeAgentCount,
          }));
        }

        if (runnerRes.ok && runnerRes.data) {
          const data = isRecord(runnerRes.data)
            ? (runnerRes.data as RunnerStatusPayload)
            : {};
          setRunner({
            completedLastHour: toNumber(data.lastHour?.completed) ?? 0,
            failedLastHour: toNumber(data.lastHour?.failed) ?? 0,
            runs: normalizeRuns(data.recentRuns),
          });
        }
      }, 6000);
      return () => clearInterval(id);
    }

    const statsSource = new EventSource(streamUrl("/dashboard"));
    statsSource.addEventListener("dashboard", (event) => {
      try {
        const raw = JSON.parse((event as MessageEvent).data);
        if (isRecord(raw) && isRecord(raw.data)) {
          const payload = raw.data as DashboardActivityPayload;
          const activity = payload.activity ?? {};
          setStats((prev) => ({
            ...prev,
            activeTaskCount:
              toNumber(activity.runningTasks) ?? prev.activeTaskCount,
            pendingApprovalCount:
              toNumber(activity.pendingApprovals) ?? prev.pendingApprovalCount,
            activeAgentCount:
              toNumber(activity.activeAgents) ?? prev.activeAgentCount,
          }));
        }
      } catch {
        // noop
      }
    });

    const runnerSource = new EventSource(streamUrl("/runner"));
    runnerSource.addEventListener("runner", (event) => {
      try {
        const raw = JSON.parse((event as MessageEvent).data);
        if (!isRecord(raw) || !isRecord(raw.data)) return;

        const payload = raw.data as RunnerStatusPayload;
        setRunner({
          completedLastHour: toNumber(payload.lastHour?.completed) ?? 0,
          failedLastHour: toNumber(payload.lastHour?.failed) ?? 0,
          runs: normalizeRuns(payload.recentRuns),
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
