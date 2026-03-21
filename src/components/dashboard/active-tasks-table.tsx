"use client";

import { tasks, agents, users, workspaces } from "@/lib/mock-data";
import { TaskStatus } from "@/lib/types";
import {
  getStatusColor,
  getPriorityColor,
  getAgentAvatarColor,
} from "@/lib/helpers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const ACTIVE_STATUSES = [TaskStatus.RUNNING, TaskStatus.QUEUED, TaskStatus.BLOCKED];

export function ActiveTasksTable() {
  const activeTasks = tasks
    .filter((t) => ACTIVE_STATUSES.includes(t.status))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 8);

  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const userMap = new Map(users.map((u) => [u.id, u]));
  const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Tasks</CardTitle>
        <CardDescription>
          {activeTasks.length} tasks in progress or queued
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Status</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeTasks.map((task) => {
              const agent = task.agentId
                ? agentMap.get(task.agentId)
                : null;
              const user = task.assignedToUserId
                ? userMap.get(task.assignedToUserId)
                : null;
              const assignee = agent
                ? { name: agent.name, initial: agent.name[0] }
                : user
                  ? { name: user.name, initial: user.name[0] }
                  : null;
              const workspace = workspaceMap.get(task.workspaceId);

              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusColor(task.status)}
                    >
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate font-medium">
                    {task.title}
                  </TableCell>
                  <TableCell>
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarFallback
                            className={cn(
                              getAgentAvatarColor(assignee.name),
                              "text-white font-bold"
                            )}
                          >
                            {assignee.initial.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          {assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getPriorityColor(task.priority)}
                    >
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {workspace?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {task.dueDate ? (
                      <span
                        className={
                          task.dueDate < new Date()
                            ? "text-red-400"
                            : "text-muted-foreground"
                        }
                      >
                        {task.dueDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
