"use client";

import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { type Task } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  getStatusColor,
  getPriorityColor,
  getAgentAvatarColor,
  formatRelativeTime,
} from "@/lib/helpers";
import { agents, workspaces, users } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const agentMap = new Map(agents.map((a) => [a.id, a]));
const userMap = new Map(users.map((u) => [u.id, u]));
const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));

export function TaskCard({ task }: { task: Task }) {
  const agent = task.agentId ? agentMap.get(task.agentId) : null;
  const user = task.assignedToUserId ? userMap.get(task.assignedToUserId) : null;
  const assignee = agent
    ? { name: agent.name, initial: agent.name[0] }
    : user
      ? { name: user.name, initial: user.name[0] }
      : null;
  const workspace = workspaceMap.get(task.workspaceId);
  const isOverdue = task.dueDate && task.dueDate < new Date();

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
          {workspace && (
            <span className="text-[10px] text-muted-foreground">{workspace.name}</span>
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

          {task.dueDate ? (
            <div
              className={cn(
                "flex items-center gap-1 text-[10px]",
                isOverdue ? "text-red-400" : "text-muted-foreground"
              )}
            >
              {isOverdue ? <Clock className="size-3" /> : <Calendar className="size-3" />}
              {task.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
