"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Archive,
  Clock,
  Cpu,
  DollarSign,
  CalendarDays,
  Tag,
  GitBranch,
  AlertCircle,
} from "lucide-react";
import {
  tasks,
  agents,
  users,
  workspaces,
  departments,
  projects,
  taskRuns,
  taskDependencies,
  comments,
  logEvents,
  artifacts,
} from "@/lib/mock-data";
import { TaskRunStatus } from "@/lib/types";
import {
  getStatusColor,
  getPriorityColor,
  getAgentAvatarColor,
  formatRelativeTime,
  formatCurrency,
} from "@/lib/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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

const agentMap = new Map(agents.map((a) => [a.id, a]));
const userMap = new Map(users.map((u) => [u.id, u]));
const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));
const deptMap = new Map(departments.map((d) => [d.id, d]));
const projectMap = new Map(projects.map((p) => [p.id, p]));

const RUN_STATUS_COLOR: Record<string, string> = {
  STARTED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  RUNNING: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  COMPLETED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/20",
  CANCELLED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const LOG_LEVEL_COLOR: Record<string, string> = {
  DEBUG: "text-zinc-500",
  INFO: "text-blue-400",
  WARN: "text-amber-400",
  ERROR: "text-red-400",
  CRITICAL: "text-red-500 font-semibold",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Task not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">The task &quot;{id}&quot; does not exist.</p>
          <Link href="/tasks" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
            Back to Tasks
          </Link>
        </div>
      </div>
    );
  }

  const agent = task.agentId ? agentMap.get(task.agentId) : null;
  const user = task.assignedToUserId ? userMap.get(task.assignedToUserId) : null;
  const workspace = workspaceMap.get(task.workspaceId);
  const project = task.projectId ? projectMap.get(task.projectId) : null;
  const dept = agent?.departmentId ? deptMap.get(agent.departmentId) : null;

  const runs = taskRuns.filter((r) => r.taskId === task.id);
  const taskComments = comments.filter((c) => c.taskId === task.id);
  const taskLogs = logEvents.filter((l) => l.taskId === task.id);
  const taskArtifacts = artifacts.filter((a) => a.taskId === task.id);
  const deps = taskDependencies.filter((d) => d.taskId === task.id || d.dependsOnTaskId === task.id);

  const totalCost = runs.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
  const isOverdue = task.dueDate && task.dueDate < new Date();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/tasks" className="hover:text-foreground">Tasks</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{task.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
              <Badge variant="outline" className={getStatusColor(task.status)}>
                {task.status.replace(/_/g, " ")}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {task.id} &middot; Created {formatRelativeTime(task.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <CheckCircle2 className="size-4" />
              Approve
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <RotateCcw className="size-4" />
              Retry
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              <Archive className="size-4" />
              Archive
            </Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            {task.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Task Runs */}
            {runs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Task Runs</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Status</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Started</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map((run) => {
                        const runAgent = agentMap.get(run.agentId);
                        return (
                          <TableRow key={run.id}>
                            <TableCell>
                              <Badge variant="outline" className={RUN_STATUS_COLOR[run.status] ?? ""}>
                                {run.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {runAgent ? (
                                <div className="flex items-center gap-2">
                                  <Avatar size="sm">
                                    <AvatarFallback
                                      className={cn(
                                        getAgentAvatarColor(runAgent.name),
                                        "text-white text-[10px] font-bold"
                                      )}
                                    >
                                      {runAgent.name[0].toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-muted-foreground">{runAgent.name}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {run.durationMs ? formatDuration(run.durationMs) : "In progress..."}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {((run.inputTokens ?? 0) + (run.outputTokens ?? 0)).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatCurrency(run.costUsd ?? 0)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatRelativeTime(run.startedAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {runs.some((r) => r.resultSummary) && (
                    <div className="mt-4 space-y-2">
                      {runs
                        .filter((r) => r.resultSummary)
                        .map((r) => (
                          <div
                            key={r.id}
                            className="rounded-md border border-border/50 bg-muted/30 p-3"
                          >
                            <p className="text-xs font-medium text-muted-foreground">Result Summary</p>
                            <p className="mt-1 text-sm text-foreground/90">{r.resultSummary}</p>
                          </div>
                        ))}
                      {runs
                        .filter((r) => r.errorMessage)
                        .map((r) => (
                          <div
                            key={`${r.id}-err`}
                            className="rounded-md border border-red-500/20 bg-red-500/5 p-3"
                          >
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="size-3.5 text-red-400" />
                              <p className="text-xs font-medium text-red-400">Error</p>
                            </div>
                            <p className="mt-1 text-sm text-red-300/90">{r.errorMessage}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            {taskComments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Comments ({taskComments.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {taskComments.map((comment) => {
                    const commentAgent = comment.agentId ? agentMap.get(comment.agentId) : null;
                    const commentUser = comment.userId ? userMap.get(comment.userId) : null;
                    const author = commentAgent
                      ? { name: commentAgent.name, initial: commentAgent.name[0], type: "agent" as const }
                      : commentUser
                        ? { name: commentUser.name, initial: commentUser.name[0], type: "user" as const }
                        : null;

                    return (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar size="sm">
                          <AvatarFallback
                            className={cn(
                              author ? getAgentAvatarColor(author.name) : "bg-zinc-600",
                              "text-white text-[10px] font-bold"
                            )}
                          >
                            {author?.initial.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{author?.name ?? "Unknown"}</span>
                            {author?.type === "agent" && (
                              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                                Agent
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Activity Log */}
            {taskLogs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {taskLogs.map((log) => {
                      const logAgent = log.agentId ? agentMap.get(log.agentId) : null;
                      return (
                        <div key={log.id} className="flex items-start gap-3">
                          <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
                            <span className={cn("size-1.5 rounded-full", LOG_LEVEL_COLOR[log.level]?.includes("red") ? "bg-red-400" : LOG_LEVEL_COLOR[log.level]?.includes("amber") ? "bg-amber-400" : "bg-blue-400")} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn("h-4 px-1 text-[10px]", LOG_LEVEL_COLOR[log.level])}>
                                {log.level}
                              </Badge>
                              {logAgent && (
                                <span className="text-xs text-muted-foreground">{logAgent.name}</span>
                              )}
                              <span className="ml-auto text-xs text-muted-foreground">
                                {formatRelativeTime(log.timestamp)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{log.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Details Card */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                {/* Status */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <Badge variant="outline" className={cn("mt-1", getStatusColor(task.status))}>
                    {task.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <Separator />

                {/* Priority */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Priority</p>
                  <Badge variant="outline" className={cn("mt-1", getPriorityColor(task.priority))}>
                    {task.priority}
                  </Badge>
                </div>

                <Separator />

                {/* Assignee */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Assignee</p>
                  {agent ? (
                    <Link
                      href={`/agents/${agent.id}`}
                      className="mt-1 flex items-center gap-2 hover:opacity-80"
                    >
                      <Avatar size="sm">
                        <AvatarFallback
                          className={cn(
                            getAgentAvatarColor(agent.name),
                            "text-white text-[10px] font-bold"
                          )}
                        >
                          {agent.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.model}</p>
                      </div>
                    </Link>
                  ) : user ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback className="bg-zinc-600 text-white text-[10px] font-bold">
                          {user.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{user.name}</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Unassigned</p>
                  )}
                </div>

                <Separator />

                {/* Workspace */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Workspace</p>
                  <p className="mt-1 text-sm">{workspace?.name ?? "—"}</p>
                </div>

                {/* Department */}
                {dept && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Department</p>
                      <p className="mt-1 text-sm">{dept.name}</p>
                    </div>
                  </>
                )}

                {/* Project */}
                {project && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Project</p>
                      <Link
                        href={`/projects/${project.id}`}
                        className="mt-1 block text-sm text-blue-400 hover:underline"
                      >
                        {project.name}
                      </Link>
                    </div>
                  </>
                )}

                <Separator />

                {/* Due Date */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Due Date</p>
                  {task.dueDate ? (
                    <div className={cn("mt-1 flex items-center gap-1.5 text-sm", isOverdue ? "text-red-400" : "")}>
                      <CalendarDays className="size-3.5" />
                      {task.dueDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {isOverdue && <span className="text-xs">(overdue)</span>}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">No due date</p>
                  )}
                </div>

                <Separator />

                {/* Labels */}
                {task.tags.length > 0 && (
                  <>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Labels</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {task.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Dates */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span>{formatRelativeTime(task.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Updated</span>
                    <span>{formatRelativeTime(task.updatedAt)}</span>
                  </div>
                </div>

                {/* Cost */}
                {totalCost > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Cost</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm">
                        <DollarSign className="size-3.5 text-emerald-400" />
                        {formatCurrency(totalCost)}
                      </p>
                    </div>
                  </>
                )}

                {/* Dependencies */}
                {deps.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Dependencies</p>
                      <div className="space-y-1.5">
                        {deps.map((dep) => {
                          const isBlocking = dep.taskId === task.id;
                          const linkedTaskId = isBlocking ? dep.dependsOnTaskId : dep.taskId;
                          const linkedTask = tasks.find((t) => t.id === linkedTaskId);
                          return (
                            <div key={dep.id} className="flex items-center gap-2">
                              <GitBranch className="size-3.5 text-muted-foreground" />
                              <Link
                                href={`/tasks/${linkedTaskId}`}
                                className="line-clamp-1 text-sm text-blue-400 hover:underline"
                              >
                                {linkedTask?.title ?? linkedTaskId}
                              </Link>
                              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                                {isBlocking ? "blocks this" : "blocked by this"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Artifacts */}
            {taskArtifacts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Artifacts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {taskArtifacts.map((artifact) => (
                    <div
                      key={artifact.id}
                      className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 p-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{artifact.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {artifact.type} &middot; {formatRelativeTime(artifact.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
