export const dynamic = "force-dynamic";
import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Bot,
  ListChecks,
  FolderKanban,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAgentAvatarColor,
  getAgentStatusColor,
  getAgentStatusDotColor,
  getStatusColor,
  getPriorityColor,
  formatRelativeTime,
} from "@/lib/helpers";
import { cn } from "@/lib/utils";

const ACTIVE_TASK_STATUSES = ["RUNNING", "QUEUED", "BLOCKED", "AWAITING_APPROVAL"];

type DepartmentDetail = Prisma.DepartmentGetPayload<{
  include: {
    workspace: { select: { id: true; name: true } };
    manager: true;
    agents: { include: { assignedTasks: { select: { id: true; status: true } } } };
    tasks: {
      include: { assigneeAgent: { select: { id: true; name: true } } };
      orderBy: { updatedAt: "desc" };
    };
    projects: { include: { tasks: { select: { id: true; status: true } } } };
  };
}>;

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let dept: DepartmentDetail | null = null;
  try {
    dept = await prisma.department.findUnique({
      where: { id },
      include: {
        workspace: { select: { id: true, name: true } },
        manager: true,
        agents: {
          include: {
            assignedTasks: { select: { id: true, status: true } },
          },
        },
        tasks: {
          include: {
            assigneeAgent: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
        projects: {
          include: {
            tasks: { select: { id: true, status: true } },
          },
        },
      },
    });
  } catch (err) {
    console.error("[department-detail] query failed:", err);
    try {
      const lighter = await prisma.department.findUnique({
        where: { id },
        include: {
          workspace: { select: { id: true, name: true } },
          manager: true,
          agents: true,
          tasks: { orderBy: { updatedAt: "desc" } },
          projects: true,
        },
      });
      if (lighter) {
        dept = {
          ...lighter,
          agents: lighter.agents.map((a) => ({ ...a, assignedTasks: [] })),
          tasks: lighter.tasks.map((t) => ({ ...t, assigneeAgent: null })),
          projects: lighter.projects.map((p) => ({ ...p, tasks: [] })),
        } as DepartmentDetail;
      }
    } catch {
      notFound();
    }
  }

  if (!dept) notFound();

  const deptAgents = dept.agents;
  const deptTasks = dept.tasks;
  const activeTasks = deptTasks.filter((t) => ACTIVE_TASK_STATUSES.includes(t.status));
  const completedTasks = deptTasks.filter((t) => t.status === "COMPLETED");
  const deptProjects = dept.projects;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/departments"
            className="transition-colors hover:text-foreground"
          >
            Departments
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{dept.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Link href="/departments">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {dept.name}
                </h1>
                <Badge
                  variant="secondary"
                  className="text-[10px] uppercase tracking-wider"
                >
                  {dept.workspace?.name}
                </Badge>
              </div>
              {dept.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {dept.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList variant="line" className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="agents">
              Agents ({deptAgents.length})
            </TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({deptTasks.length})</TabsTrigger>
            <TabsTrigger value="projects">
              Projects ({deptProjects.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                      <Bot className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">
                        {deptAgents.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Agents</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                      <ListChecks className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">
                        {activeTasks.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Active Tasks
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                      <FolderKanban className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">
                        {deptProjects.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Projects</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                      <Clock className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">
                        {completedTasks.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Department Info */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Department Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Workspace
                      </p>
                      <p className="mt-1 text-sm">{dept.workspace?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Description
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {dept.description || "No description"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Created
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {dept.createdAt.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Lead Agent */}
                <Card>
                  <CardHeader>
                    <CardTitle>Team Lead</CardTitle>
                    <CardDescription>
                      Primary agent responsible for this department
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dept.manager ? (
                      <div className="flex items-center gap-4">
                        <Avatar size="lg">
                          <AvatarFallback
                            className={cn(
                              getAgentAvatarColor(dept.manager.name),
                              "text-sm font-bold text-white"
                            )}
                          >
                            {dept.manager.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{dept.manager.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {dept.manager.description}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-block h-2 w-2 rounded-full",
                                getAgentStatusDotColor(dept.manager.status)
                              )}
                            />
                            <span
                              className={cn(
                                "text-xs",
                                getAgentStatusColor(dept.manager.status)
                              )}
                            >
                              {dept.manager.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : deptAgents.length > 0 ? (
                      <div className="flex items-center gap-4">
                        <Avatar size="lg">
                          <AvatarFallback
                            className={cn(
                              getAgentAvatarColor(deptAgents[0].name),
                              "text-sm font-bold text-white"
                            )}
                          >
                            {deptAgents[0].name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{deptAgents[0].name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {deptAgents[0].description}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-block h-2 w-2 rounded-full",
                                getAgentStatusDotColor(deptAgents[0].status)
                              )}
                            />
                            <span
                              className={cn(
                                "text-xs",
                                getAgentStatusColor(deptAgents[0].status)
                              )}
                            >
                              {deptAgents[0].status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No agents assigned
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deptAgents.map((agent) => {
                const agentActiveTasks = agent.assignedTasks.filter((t) =>
                  ACTIVE_TASK_STATUSES.includes(t.status)
                );

                return (
                  <Card
                    key={agent.id}
                    className="transition-all hover:ring-2 hover:ring-primary/20"
                  >
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback
                            className={cn(
                              getAgentAvatarColor(agent.name),
                              "text-sm font-bold text-white"
                            )}
                          >
                            {agent.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{agent.name}</p>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-block h-1.5 w-1.5 rounded-full",
                                getAgentStatusDotColor(agent.status)
                              )}
                            />
                            <span
                              className={cn(
                                "text-xs",
                                getAgentStatusColor(agent.status)
                              )}
                            >
                              {agent.status}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {agent.model.split("-").slice(0, 2).join("-")}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {agent.description}
                      </p>

                      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                        <span>
                          {agentActiveTasks.length} active task
                          {agentActiveTasks.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {deptAgents.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                  No agents assigned to this department
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Status</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deptTasks.map((task) => {
                      const agent = task.assigneeAgent;
                      return (
                        <TableRow key={task.id}>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getStatusColor(task.status)}
                            >
                              {task.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate font-medium">
                            {task.title}
                          </TableCell>
                          <TableCell>
                            {agent ? (
                              <div className="flex items-center gap-2">
                                <Avatar size="sm">
                                  <AvatarFallback
                                    className={cn(
                                      getAgentAvatarColor(agent.name),
                                      "text-white font-bold"
                                    )}
                                  >
                                    {agent.name[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">
                                  {agent.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                —
                              </span>
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
                            {formatRelativeTime(task.updatedAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {deptTasks.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-12 text-center text-muted-foreground"
                        >
                          No tasks in this department
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deptProjects.map((project) => {
                const projectTasks = project.tasks;
                const completedCount = projectTasks.filter(
                  (t) => t.status === "COMPLETED"
                ).length;
                const progress =
                  projectTasks.length > 0
                    ? Math.round((completedCount / projectTasks.length) * 100)
                    : 0;

                return (
                  <Card
                    key={project.id}
                    className="transition-all hover:ring-2 hover:ring-primary/20"
                  >
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold tracking-tight">
                          {project.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={getStatusColor(project.status)}
                        >
                          {project.status}
                        </Badge>
                      </div>
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Progress
                          </span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                        <span>
                          {completedCount}/{projectTasks.length} tasks done
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {deptProjects.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                  No projects in this department
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
