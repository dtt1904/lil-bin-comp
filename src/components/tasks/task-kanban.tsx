"use client";

import { TaskCard } from "./task-card";
import type { SerializedTask } from "./task-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const KANBAN_COLUMNS: { status: string; label: string }[] = [
  { status: "BACKLOG", label: "Backlog" },
  { status: "QUEUED", label: "Queued" },
  { status: "RUNNING", label: "Running" },
  { status: "BLOCKED", label: "Blocked" },
  { status: "AWAITING_APPROVAL", label: "Awaiting Approval" },
  { status: "COMPLETED", label: "Completed" },
];

const STATUS_DOT_COLOR: Record<string, string> = {
  BACKLOG: "bg-zinc-400",
  QUEUED: "bg-amber-400",
  RUNNING: "bg-blue-400",
  BLOCKED: "bg-red-400",
  AWAITING_APPROVAL: "bg-violet-400",
  FAILED: "bg-red-400",
  COMPLETED: "bg-emerald-400",
  ARCHIVED: "bg-zinc-500",
};

export function TaskKanban({ tasks }: { tasks: SerializedTask[] }) {
  const grouped = new Map<string, SerializedTask[]>();
  for (const col of KANBAN_COLUMNS) {
    grouped.set(col.status, []);
  }
  for (const task of tasks) {
    const col = grouped.get(task.status);
    if (col) col.push(task);
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4" style={{ minWidth: `${KANBAN_COLUMNS.length * 300}px` }}>
        {KANBAN_COLUMNS.map(({ status, label }) => {
          const columnTasks = grouped.get(status) ?? [];
          return (
            <div key={status} className="flex w-[280px] min-w-[280px] flex-col">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={cn("size-2 rounded-full", STATUS_DOT_COLOR[status])} />
                <h3 className="text-sm font-medium text-foreground">{label}</h3>
                <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 rounded-lg bg-muted/30 p-2">
                {columnTasks.length === 0 ? (
                  <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border/50">
                    <span className="text-xs text-muted-foreground/60">No tasks</span>
                  </div>
                ) : (
                  columnTasks.map((task) => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
