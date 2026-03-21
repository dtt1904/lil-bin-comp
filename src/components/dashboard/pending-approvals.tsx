"use client";

import { approvals, tasks, agents } from "@/lib/mock-data";
import { ApprovalStatus } from "@/lib/types";
import { formatRelativeTime, getPriorityColor } from "@/lib/helpers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

export function PendingApprovals() {
  const pending = approvals.filter(
    (a) => a.status === ApprovalStatus.PENDING
  );
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          Pending Approvals
        </CardTitle>
        <CardDescription>{pending.length} awaiting review</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">All clear</p>
        ) : (
          pending.map((approval) => {
            const task = taskMap.get(approval.taskId);
            const requester = approval.requestedById.startsWith("agent-")
              ? agentMap.get(approval.requestedById)?.name
              : approval.requestedById;

            return (
              <div
                key={approval.id}
                className="rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {task?.title ?? "Unknown task"}
                  </p>
                  {task && (
                    <Badge
                      variant="outline"
                      className={getPriorityColor(task.priority)}
                    >
                      {task.priority}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {approval.reason}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>by {requester}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{formatRelativeTime(approval.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
