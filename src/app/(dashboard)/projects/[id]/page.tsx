"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  FileText,
} from "lucide-react";
import {
  projects,
  tasks,
  agents,
  users,
  workspaces,
  artifacts,
  taskRuns,
} from "@/lib/mock-data";
import { TaskStatus, type Task } from "@/lib/types";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PROJECT_STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  PAUSED: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  ARCHIVED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const agentMap = new Map(agents.map((a) => [a.id, a]));
const userMap = new Map(users.map((u) => [u.id, u]));
const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Project not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">The project &quot;{id}&quot; does not exist.</p>
          <Link href="/projects" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const workspace = workspaceMap.get(project.workspaceId);
  const owner = userMap.get(project.ownerId);
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const completedCount = projectTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
  const runningCount = projectTasks.filter((t) => t.status === TaskStatus.RUNNING).length;
  const blockedCount = projectTasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
  const progress = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;

  const projectAgentIds = new Set(projectTasks.map((t) => t.agentId).filter(Boolean));
  const projectAgents = agents.filter((a) => projectAgentIds.has(a.id));

  const projectArtifacts = artifacts.filter((a) =>
    projectTasks.some((t) => t.id === a.taskId)
  );

  const projectRuns = taskRuns.filter((r) =>
    projectTasks.some((t) => t.id === r.taskId)
  );
  const totalCost = projectRuns.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);

  const isOverdue = project.endDate && project.endDate < new Date() && project.status !== "COMPLETED";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground">Projects</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{project.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <Badge variant="outline" className={PROJECT_STATUS_COLOR[project.status]}>
              {project.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {workspace && <span>{workspace.name}</span>}
            {owner && <span>Owner: {owner.name}</span>}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({projectTasks.length})</TabsTrigger>
            <TabsTrigger value="agents">Agents ({projectAgents.length})</TabsTrigger>
            <TabsTrigger value="artifacts">Artifacts ({projectArtifacts.length})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left - Stats & Description */}
              <div className="space-y-6 lg:col-span-2">
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Total Tasks</p>
                      <p className="mt-1 text-2xl font-semibold">{projectTasks.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <p className="mt-1 text-2xl font-semibold text-emerald-400">{completedCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="size-3.5 text-blue-400" />
                        <p className="text-xs text-muted-foreground">Running</p>
                      </div>
                      <p className="mt-1 text-2xl font-semibold text-blue-400">{runningCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="size-3.5 text-red-400" />
                        <p className="text-xs text-muted-foreground">Blocked</p>
                      </div>
                      <p className="mt-1 text-2xl font-semibold text-red-400">{blockedCount}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress */}
                <Card>
                  <CardContent className="p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {completedCount} of {projectTasks.length} tasks completed
                    </p>
                  </CardContent>
                </Card>

                {/* Description */}
                {project.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {project.description}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Status</p>
                      <Badge variant="outline" className={cn("mt-1", PROJECT_STATUS_COLOR[project.status])}>
                        {project.status}
                      </Badge>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Workspace</p>
                      <p className="mt-1 text-sm">{workspace?.name ?? "—"}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Owner</p>
                      {owner ? (
                        <div className="mt-1 flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarFallback className="bg-zinc-600 text-white text-[10px] font-bold">
                              {owner.name[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{owner.name}</span>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                    <Separator />
                    {project.startDate && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Start Date</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm">
                          <CalendarDays className="size-3.5" />
                          {project.startDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                    {project.endDate && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">End Date</p>
                          <p
                            className={cn(
                              "mt-1 flex items-center gap-1.5 text-sm",
                              isOverdue ? "text-red-400" : ""
                            )}
                          >
                            <CalendarDays className="size-3.5" />
                            {project.endDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {isOverdue && <span className="text-xs">(overdue)</span>}
                          </p>
                        </div>
                      </>
                    )}
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Created</span>
                        <span>{formatRelativeTime(project.createdAt)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Updated</span>
                        <span>{formatRelativeTime(project.updatedAt)}</span>
                      </div>
                    </div>
                    {totalCost > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Total Cost</p>
                          <p className="mt-1 text-sm font-medium">{formatCurrency(totalCost)}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <div className="mt-6">
              <div className="rounded-lg border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Status</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No tasks in this project.
                        </TableCell>
                      </TableRow>
                    ) : (
                      projectTasks.map((task) => {
                        const agent = task.agentId ? agentMap.get(task.agentId) : null;
                        const taskUser = task.assignedToUserId ? userMap.get(task.assignedToUserId) : null;
                        const assignee = agent
                          ? { name: agent.name, initial: agent.name[0] }
                          : taskUser
                            ? { name: taskUser.name, initial: taskUser.name[0] }
                            : null;
                        const taskOverdue = task.dueDate && task.dueDate < new Date();

                        return (
                          <TableRow key={task.id}>
                            <TableCell>
                              <Badge variant="outline" className={getStatusColor(task.status)}>
                                {task.status.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/tasks/${task.id}`}
                                className="font-medium text-foreground hover:underline"
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
                            <TableCell>
                              {task.dueDate ? (
                                <span
                                  className={cn(
                                    "text-sm",
                                    taskOverdue ? "font-medium text-red-400" : "text-muted-foreground"
                                  )}
                                >
                                  {task.dueDate.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatRelativeTime(task.updatedAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents">
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projectAgents.length === 0 ? (
                <div className="col-span-full flex h-32 items-center justify-center rounded-lg border border-dashed border-border/50">
                  <p className="text-sm text-muted-foreground">No agents assigned to this project.</p>
                </div>
              ) : (
                projectAgents.map((agent) => {
                  const agentTasks = projectTasks.filter((t) => t.agentId === agent.id);
                  const agentCompleted = agentTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
                  return (
                    <Link key={agent.id} href={`/agents/${agent.id}`} className="block">
                      <Card className="group transition-all hover:border-border hover:bg-muted/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback
                                className={cn(
                                  getAgentAvatarColor(agent.name),
                                  "text-white font-bold"
                                )}
                              >
                                {agent.name[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate text-sm font-semibold">{agent.name}</h4>
                              <p className="text-xs text-muted-foreground">{agent.model}</p>
                            </div>
                            <Badge variant="outline" className={getStatusColor(agent.status)}>
                              {agent.status}
                            </Badge>
                          </div>
                          <Separator className="my-3" />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{agentTasks.length} tasks assigned</span>
                            <span className="text-emerald-400">{agentCompleted} completed</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Artifacts Tab */}
          <TabsContent value="artifacts">
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projectArtifacts.length === 0 ? (
                <div className="col-span-full flex h-32 items-center justify-center rounded-lg border border-dashed border-border/50">
                  <p className="text-sm text-muted-foreground">No artifacts generated yet.</p>
                </div>
              ) : (
                projectArtifacts.map((artifact) => {
                  const artifactAgent = artifact.agentId ? agentMap.get(artifact.agentId) : null;
                  return (
                    <Card key={artifact.id} className="transition-all hover:border-border hover:bg-muted/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <FileText className="size-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-medium">{artifact.name}</h4>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                                {artifact.type}
                              </Badge>
                              {artifactAgent && <span>{artifactAgent.name}</span>}
                              <span>{formatRelativeTime(artifact.createdAt)}</span>
                            </div>
                            {artifact.sizeBytes && (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {(artifact.sizeBytes / 1024).toFixed(1)} KB
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
