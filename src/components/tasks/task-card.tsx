"use client";

import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  getPriorityColor,
  getAgentAvatarColor,
  getRenderNowMs,
} from "@/lib/helpers";
import { cn } from "@/lib/utils";

export interface SerializedTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  workspaceId: string | null;
  projectId: string | null;
  assigneeAgentId: string | null;
  dueDate: string | null;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  assigneeAgent: { id: string; name: string; slug: string } | null;
  workspace: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
}

export function TaskCard({ task }: { task: SerializedTask }) {
  const assignee = task.assigneeAgent
    ? { name: task.assigneeAgent.name, initial: task.assigneeAgent.name[0] }
    : null;
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date(getRenderNowMs());

  return (
    <Link href={`/tasks/${task.id}`} className="block">
      <div className="group rounded-lg border border-border/50 bg-card p-3 transition-all hover:border-border hover:bg-muted/30">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h4 className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-foreground/90">
            {task.title}
          </h4>
        </div>

        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn("text-[10px]", getPriorityColor(task.priority))}>
            {task.priority}
          </Badge>
          {task.workspace && (
            <span className="text-[10px] text-muted-foreground">{task.workspace.name}</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          {assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar size="sm">
                <AvatarFallback
                  className={cn(getAgentAvatarColor(assignee.name), "text-white text-[10px] font-bold")}
                >
                  {assignee.initial.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{assignee.name}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}

          {dueDate ? (
            <div
              className={cn(
                "flex items-center gap-1 text-[10px]",
                isOverdue ? "text-red-400" : "text-muted-foreground"
              )}
            >
              {isOverdue ? <Clock className="size-3" /> : <Calendar className="size-3" />}
              {dueDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
