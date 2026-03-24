"use client";

import { formatRelativeTime } from "@/lib/helpers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, CheckCircle2, XCircle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

interface RunRow {
  id: string;
  taskId: string;
  runnerId: string | null;
  status: string;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface RunnerActivityProps {
  runs: RunRow[];
  completedLastHour: number;
  failedLastHour: number;
}

const STATUS_CONFIG: Record<string, { icon: typeof Play; color: string; badge: string }> = {
  STARTED: { icon: Play, color: "text-blue-400", badge: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  RUNNING: { icon: Play, color: "text-blue-400", badge: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  COMPLETED: { icon: CheckCircle2, color: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  FAILED: { icon: XCircle, color: "text-red-400", badge: "bg-red-500/15 text-red-400 border-red-500/20" },
  CANCELLED: { icon: Ban, color: "text-zinc-400", badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
};

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "running";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function RunnerActivity({ runs, completedLastHour, failedLastHour }: RunnerActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-4 w-4 text-blue-400" />
          Runner Activity
        </CardTitle>
        <CardDescription>
          Last hour: {completedLastHour} completed, {failedLastHour} failed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs yet</p>
        ) : (
          runs.map((run) => {
            const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.STARTED;
            const Icon = cfg.icon;

            return (
              <div
                key={run.id}
                className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px]", cfg.badge)}>
                      {run.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDuration(run.startedAt, run.completedAt)}
                    </span>
                  </div>
                  {run.error && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-red-400/80">
                      {run.error}
                    </p>
                  )}
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    {run.runnerId && <span>{run.runnerId}</span>}
                    <span className="text-muted-foreground/40">·</span>
                    <span>{formatRelativeTime(new Date(run.startedAt))}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
