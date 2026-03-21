"use client";

import { useState, useMemo } from "react";
import { LayoutList, Kanban, Plus, X } from "lucide-react";
import { getStatusColor, getPriorityColor } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskKanban } from "@/components/tasks/task-kanban";
import type { SerializedTask } from "@/components/tasks/task-card";
import { cn } from "@/lib/utils";

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

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedStatuses.size > 0 && !selectedStatuses.has(t.status)) return false;
      if (selectedPriority && t.priority !== selectedPriority) return false;
      if (selectedWorkspace && t.workspaceId !== selectedWorkspace) return false;
      return true;
    });
  }, [tasks, selectedStatuses, selectedPriority, selectedWorkspace]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} task{filtered.length !== 1 ? "s" : ""} across all workspaces
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-border/50 bg-muted/50 p-0.5">
              <button
                onClick={() => setView("table")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  view === "table"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="size-4" />
                Table
              </button>
              <button
                onClick={() => setView("board")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  view === "board"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Kanban className="size-4" />
                Board
              </button>
            </div>

            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              Create Task
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-6 space-y-3">
          {/* Status Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            {ALL_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-all",
                  selectedStatuses.has(status)
                    ? getStatusColor(status)
                    : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {status.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Priority + Workspace */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Priority</span>
              {ALL_PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(selectedPriority === p ? null : p)}
                  className={cn(
                    "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-all",
                    selectedPriority === p
                      ? getPriorityColor(p)
                      : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-border/50" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Workspace</span>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setSelectedWorkspace(selectedWorkspace === ws.id ? null : ws.id)}
                  className={cn(
                    "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-all",
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
                <div className="h-5 w-px bg-border/50" />
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                  Clear filters
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {view === "table" ? <TaskTable tasks={filtered} /> : <TaskKanban tasks={filtered} />}
      </div>
    </div>
  );
}
