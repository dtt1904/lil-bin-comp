import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Bot,
  Users,
  ListChecks,
  FolderKanban,
  Building2,
  Calendar,
  Settings,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  workspaces,
  departments,
  agents,
  tasks,
  projects,
  logEvents,
  organization,
} from "@/lib/mock-data";
import {
  TaskStatus,
  ProjectStatus,
  AgentStatus,
} from "@/lib/types";
import {
  formatRelativeTime,
  getStatusColor,
  getAgentStatusDotColor,
  getAgentAvatarColor,
} from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { getWorkspaceTypeBadgeClass } from "@/components/workspaces/workspace-card";

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = workspaces.find((w) => w.id === id);

  if (!workspace) {
    notFound();
  }

  const wsDepartments = departments.filter((d) => d.workspaceId === id);
  const wsAgents = agents.filter((a) => a.workspaceId === id);
  const wsTasks = tasks.filter((t) => t.workspaceId === id);
  const wsProjects = projects.filter((p) => p.workspaceId === id);
  const wsLogs = logEvents
    .filter((l) => l.workspaceId === id)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

  const activeTaskCount = wsTasks.filter(
    (t) => t.status === TaskStatus.RUNNING || t.status === TaskStatus.QUEUED
  ).length;
  const completedTaskCount = wsTasks.filter(
    (t) => t.status === TaskStatus.COMPLETED
  ).length;
  const activeProjectCount = wsProjects.filter(
    (p) => p.status === ProjectStatus.ACTIVE
  ).length;
  const onlineAgentCount = wsAgents.filter(
    (a) => a.status === AgentStatus.ONLINE || a.status === AgentStatus.BUSY
  ).length;

  const recentTasks = wsTasks
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 8);

  const statCards = [
    {
      label: "Active Agents",
      value: `${onlineAgentCount}/${wsAgents.length}`,
      icon: Bot,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Departments",
      value: wsDepartments.length,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Active Tasks",
      value: activeTaskCount,
      icon: ListChecks,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Active Projects",
      value: activeProjectCount,
      icon: FolderKanban,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
  ];

  function getInitials(name: string): string {
    return name
      .replace(/[_-]/g, " ")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/workspaces"
          className="transition-colors hover:text-foreground"
        >
          Workspaces
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{workspace.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {workspace.name}
            </h1>
            <Badge
              className={getWorkspaceTypeBadgeClass(workspace.type)}
            >
              {workspace.type}
            </Badge>
          </div>
          {workspace.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {workspace.description}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="departments">
            Departments ({wsDepartments.length})
          </TabsTrigger>
          <TabsTrigger value="agents">
            Agents ({wsAgents.length})
          </TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({wsTasks.length})</TabsTrigger>
          <TabsTrigger value="projects">
            Projects ({wsProjects.length})
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ───────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      stat.bg
                    )}
                  >
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tracking-tight">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Recent Tasks */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
                <CardDescription>
                  Latest task activity in this workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTasks.map((task) => {
                      const agent = agents.find(
                        (a) => a.id === task.agentId
                      );
                      return (
                        <TableRow key={task.id}>
                          <TableCell className="max-w-[240px] truncate font-medium">
                            {task.title}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {agent?.name ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-xs",
                                getStatusColor(task.status)
                              )}
                            >
                              {task.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatRelativeTime(task.updatedAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {wsLogs.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No recent activity
                    </p>
                  )}
                  {wsLogs.map((log) => {
                    const agent = agents.find(
                      (a) => a.id === log.agentId
                    );
                    return (
                      <div key={log.id} className="flex gap-3">
                        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Activity className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm leading-snug line-clamp-2">
                            {log.message}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {agent?.name} ·{" "}
                            {formatRelativeTime(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Departments Tab ────────────────────────────────────────── */}
        <TabsContent value="departments" className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wsDepartments.map((dept) => {
              const deptAgents = wsAgents.filter(
                (a) => a.departmentId === dept.id
              );
              const deptTasks = wsTasks.filter(
                (t) =>
                  deptAgents.some((a) => a.id === t.agentId)
              );
              return (
                <Card key={dept.id}>
                  <CardHeader>
                    <CardTitle>{dept.name}</CardTitle>
                    {dept.description && (
                      <CardDescription>{dept.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5" />
                        <span>{deptAgents.length} agents</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5" />
                        <span>{deptTasks.length} tasks</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Agents Tab ─────────────────────────────────────────────── */}
        <TabsContent value="agents" className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wsAgents.map((agent) => {
              const currentTask = tasks.find(
                (t) =>
                  t.agentId === agent.id &&
                  t.status === TaskStatus.RUNNING
              );
              return (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="block"
                >
                  <Card className="group cursor-pointer transition-all hover:ring-foreground/20">
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white",
                            getAgentAvatarColor(agent.name)
                          )}
                        >
                          {getInitials(agent.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium group-hover:text-primary transition-colors">
                              {agent.name}
                            </span>
                            <div
                              className={cn(
                                "h-2 w-2 shrink-0 rounded-full",
                                getAgentStatusDotColor(agent.status)
                              )}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {agent.provider === "openai"
                              ? "OpenAI"
                              : "Anthropic"}{" "}
                            / {agent.model}
                          </p>
                        </div>
                      </div>
                      {currentTask && (
                        <div className="rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-1 text-xs text-blue-400 line-clamp-1">
                          {currentTask.title}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Tasks Tab ──────────────────────────────────────────────── */}
        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wsTasks
                    .sort(
                      (a, b) =>
                        b.updatedAt.getTime() - a.updatedAt.getTime()
                    )
                    .map((task) => {
                      const agent = agents.find(
                        (a) => a.id === task.agentId
                      );
                      return (
                        <TableRow key={task.id}>
                          <TableCell className="max-w-[280px] truncate font-medium">
                            {task.title}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {agent?.name ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-xs",
                                getStatusColor(task.status)
                              )}
                            >
                              {task.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {task.dueDate
                              ? formatRelativeTime(task.dueDate)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatRelativeTime(task.updatedAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Projects Tab ───────────────────────────────────────────── */}
        <TabsContent value="projects" className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {wsProjects.map((project) => {
              const projectTasks = wsTasks.filter(
                (t) => t.projectId === project.id
              );
              const completedCount = projectTasks.filter(
                (t) => t.status === TaskStatus.COMPLETED
              ).length;
              const statusColor: Record<string, string> = {
                ACTIVE:
                  "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
                PAUSED:
                  "bg-amber-500/15 text-amber-400 border-amber-500/20",
                COMPLETED:
                  "bg-blue-500/15 text-blue-400 border-blue-500/20",
                ARCHIVED:
                  "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
              };
              return (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{project.name}</CardTitle>
                      <Badge
                        className={cn(
                          "text-xs",
                          statusColor[project.status]
                        )}
                      >
                        {project.status}
                      </Badge>
                    </div>
                    {project.description && (
                      <CardDescription>
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {completedCount}/{projectTasks.length} tasks done
                      </span>
                      {project.endDate && (
                        <span>
                          Due {formatRelativeTime(project.endDate)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Settings Tab ───────────────────────────────────────────── */}
        <TabsContent value="settings" className="mt-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Workspace Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{workspace.name}</span>

                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono text-muted-foreground">
                  {workspace.slug}
                </span>

                <span className="text-muted-foreground">Type</span>
                <span>
                  <Badge
                    className={getWorkspaceTypeBadgeClass(workspace.type)}
                  >
                    {workspace.type}
                  </Badge>
                </span>

                <span className="text-muted-foreground">Organization</span>
                <span className="font-medium">{organization.name}</span>

                <span className="text-muted-foreground">Description</span>
                <span>{workspace.description || "—"}</span>

                <span className="text-muted-foreground">Created</span>
                <span>
                  {workspace.createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>

                <span className="text-muted-foreground">Last Updated</span>
                <span>{formatRelativeTime(workspace.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
