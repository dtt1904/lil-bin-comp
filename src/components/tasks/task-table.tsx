"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import {
  getStatusColor,
  getPriorityColor,
  getAgentAvatarColor,
  formatRelativeTime,
  getRenderNowMs,
} from "@/lib/helpers";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SerializedTask } from "./task-card";

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

type SortField = "priority" | "dueDate" | null;
type SortDir = "asc" | "desc";

export function TaskTable({ tasks }: { tasks: SerializedTask[] }) {
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortField) return tasks;
    return [...tasks].sort((a, b) => {
      let cmp = 0;
      if (sortField === "priority") {
        cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      } else if (sortField === "dueDate") {
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        cmp = aTime - bTime;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [tasks, sortField, sortDir]);

  return (
    <div className="rounded-lg border border-border/50 overflow-x-auto">
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[130px]">Status</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-[100px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-7 text-xs"
                onClick={() => toggleSort("priority")}
              >
                Priority
                <ArrowUpDown className="ml-1 size-3" />
              </Button>
            </TableHead>
            <TableHead className="w-[140px]">Assignee</TableHead>
            <TableHead className="w-[120px]">Customer</TableHead>
            <TableHead className="w-[140px]">Project</TableHead>
            <TableHead className="w-[100px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-7 text-xs"
                onClick={() => toggleSort("dueDate")}
              >
                Due Date
                <ArrowUpDown className="ml-1 size-3" />
              </Button>
            </TableHead>
            <TableHead className="w-[90px]">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((task) => {
            const assignee = task.assigneeAgent
              ? { name: task.assigneeAgent.name, initial: task.assigneeAgent.name[0] }
              : null;
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const isOverdue = dueDate && dueDate < new Date(getRenderNowMs());

            return (
              <TableRow key={task.id} className="group">
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(task.status)}>
                    {task.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[300px]">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="line-clamp-1 font-medium text-foreground hover:text-foreground/80 hover:underline"
                  >
                    {task.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  {assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback
                          className={cn(
                            getAgentAvatarColor(assignee.name),
                            "text-white text-[10px] font-bold"
                          )}
                        >
                          {assignee.initial.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {task.workspace?.name ?? "Internal"}
                </TableCell>
                <TableCell className="max-w-[140px]">
                  {task.project ? (
                    <Link
                      href={`/projects/${task.project.id}`}
                      className="line-clamp-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {task.project.name}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {dueDate ? (
                    <span className={cn("text-sm", isOverdue ? "font-medium text-red-400" : "text-muted-foreground")}>
                      {dueDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatRelativeTime(new Date(task.createdAt))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
