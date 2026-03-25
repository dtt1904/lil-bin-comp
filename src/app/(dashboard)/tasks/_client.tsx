"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutList, Kanban, X } from "lucide-react";
import { getStatusColor, getPriorityColor } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskKanban } from "@/components/tasks/task-kanban";
import type { SerializedTask } from "@/components/tasks/task-card";
import { cn } from "@/lib/utils";
import { CreateTaskModal } from "@/components/forms/create-task-modal";
import { streamUrl } from "@/lib/live-stream";
import { api } from "@/lib/api-client";

const ALL_STATUSES = [
  "BACKLOG",
  "QUEUED",
  "RUNNING",
  "BLOCKED",
  "AWAITING_APPROVAL",
  "FAILED",
  "COMPLETED",
  "ARCHIVED",
];

const ALL_PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

interface TasksPageClientProps {
  tasks: SerializedTask[];
  workspaces: { id: string; name: string }[];
}

export function TasksPageClient({ tasks, workspaces }: TasksPageClientProps) {
  const [liveTasks, setLiveTasks] = useState<SerializedTask[]>(tasks);
  const [liveConnected, setLiveConnected] = useState(false);
  const [view, setView] = useState<"table" | "board">("table");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  function toggleStatus(status: string) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function clearFilters() {
    setSelectedStatuses(new Set());
    setSelectedPriority(null);
    setSelectedWorkspace(null);
  }

  const hasFilters = selectedStatuses.size > 0 || selectedPriority || selectedWorkspace;

  useEffect(() => {
    setLiveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      const id = setInterval(async () => {
        const res = await api<SerializedTask[]>("/tasks?limit=120");
        if (res.ok && res.data) {
          setLiveConnected(false);
          setLiveTasks(res.data);
        }
      }, 5000);
      return () => clearInterval(id);
    }

    const es = new EventSource(streamUrl("/tasks"));
    es.addEventListener("connected", () => setLiveConnected(true));
    es.addEventListener("tasks", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        if (payload?.data) {
          setLiveTasks(payload.data as SerializedTask[]);
        }
      } catch {
        // ignore malformed frames
      }
    });
    es.onerror = () => setLiveConnected(false);
    return () => es.close();
  }, []);

  const filtered = useMemo(() => {
    return liveTasks.filter((t) => {
      if (selectedStatuses.size > 0 && !selectedStatuses.has(t.status)) return false;
      if (selectedPriority && t.priority !== selectedPriority) return false;
      if (selectedWorkspace && t.workspaceId !== selectedWorkspace) return false;
      return true;
    });
  }, [liveTasks, selectedStatuses, selectedPriority, selectedWorkspace]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Tasks</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              {filtered.length} task{filtered.length !== 1 ? "s" : ""} across all workspaces
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Live:{" "}
              <span className={liveConnected ? "text-emerald-400" : "text-amber-400"}>
                {liveConnected ? "connected" : "reconnecting"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-border/50 bg-muted/50 p-0.5">
              <button
                onClick={() => setView("table")}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all",
                  view === "table"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="size-3.5 sm:size-4" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                onClick={() => setView("board")}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all",
                  view === "board"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Kanban className="size-3.5 sm:size-4" />
                <span className="hidden sm:inline">Board</span>
              </button>
            </div>

            <CreateTaskModal workspaces={workspaces} />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
          {/* Status Chips — horizontal scroll on mobile */}
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground shrink-0">Status</span>
              {ALL_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    "inline-flex h-6 sm:h-7 items-center gap-1 sm:gap-1.5 rounded-md border px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap",
                    selectedStatuses.has(status)
                      ? getStatusColor(status)
                      : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  {status.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Priority + Workspace — horizontal scroll on mobile */}
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-max">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground shrink-0">Priority</span>
                {ALL_PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPriority(selectedPriority === p ? null : p)}
                    className={cn(
                      "inline-flex h-6 sm:h-7 items-center rounded-md border px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium transition-all",
                      selectedPriority === p
                        ? getPriorityColor(p)
                        : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="h-5 w-px bg-border/50 shrink-0" />

              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground shrink-0">Workspace</span>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => setSelectedWorkspace(selectedWorkspace === ws.id ? null : ws.id)}
                    className={cn(
                      "inline-flex h-6 sm:h-7 items-center rounded-md border px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap",
                      selectedWorkspace === ws.id
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                        : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    {ws.name}
                  </button>
                ))}
              </div>

              {hasFilters && (
                <>
                  <div className="h-5 w-px bg-border/50 shrink-0" />
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
                  >
                    <X className="size-3" />
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {view === "table" ? <TaskTable tasks={filtered} /> : <TaskKanban tasks={filtered} />}
      </div>
    </div>
  );
}
