"use client";

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

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  updatedAt: string;
  workspaceName: string | null;
  assigneeName: string | null;
}

interface ActiveTasksTableProps {
  tasks: TaskRow[];
}

export function ActiveTasksTable({ tasks }: ActiveTasksTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Tasks</CardTitle>
        <CardDescription>
          {tasks.length} tasks in progress or queued
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
            {tasks.map((task) => (
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
                  {task.assigneeName ? (
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback
                          className={cn(
                            getAgentAvatarColor(task.assigneeName),
                            "text-white font-bold"
                          )}
                        >
                          {task.assigneeName[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        {task.assigneeName}
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
                  {task.workspaceName ?? "—"}
                </TableCell>
                <TableCell>
                  {task.dueDate ? (
                    <span
                      className={
                        new Date(task.dueDate) < new Date()
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }
                    >
                      {new Date(task.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
