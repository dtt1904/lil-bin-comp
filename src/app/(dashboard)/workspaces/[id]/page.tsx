export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Bot,
  Users,
  ListChecks,
  FolderKanban,
  Building2,
  Settings,
  Activity,
  AlertTriangle,
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
import { prisma } from "@/lib/db";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/default-organization";
import {
  formatRelativeTime,
  getStatusColor,
  getAgentStatusDotColor,
  getAgentAvatarColor,
} from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { getWorkspaceTypeBadgeClass } from "@/components/workspaces/workspace-card";

type DeptRow = {
  id: string;
  name: string;
  description: string | null;
  _count: { agents: number; tasks: number };
};
type AgentRow = {
  id: string;
  name: string;
  status: string;
  provider: string;
  model: string;
  assignedTasks: { title: string }[];
};
type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  updatedAt: Date;
  assigneeAgent: { name: string } | null;
};
type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tasks: { status: string }[];
};
type LogRow = {
  id: string;
  message: string;
  createdAt: Date;
  agent: { name: string } | null;
};

function SectionError({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Could not load {label}. This may be caused by a pending database
        migration. Other sections still work.
      </span>
    </div>
  );
}

async function safeFetch<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<{ data: T; ok: boolean }> {
  try {
    return { data: await fn(), ok: true };
  } catch (err) {
    console.error("[workspace-detail] query failed:", err);
    return { data: fallback, ok: false };
  }
}

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workspace = await prisma.workspace.findFirst({
    where: { id, organizationId: DEFAULT_ORGANIZATION_ID },
    include: { organization: { select: { name: true } } },
  });

  if (!workspace) {
    notFound();
  }

  const [departments, agents, tasks, projects, logs] = await Promise.all([
    safeFetch<DeptRow[]>(
      () =>
        prisma.department.findMany({
          where: { workspaceId: id },
          include: { _count: { select: { agents: true, tasks: true } } },
        }),
      []
    ),
    safeFetch<AgentRow[]>(
      () =>
        prisma.agent.findMany({
          where: { workspaceId: id },
          include: {
            assignedTasks: {
              where: { status: "RUNNING" },
              take: 1,
              select: { title: true },
            },
          },
        }),
      []
    ),
    safeFetch<TaskRow[]>(
      () =>
        prisma.task.findMany({
          where: { workspaceId: id },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            updatedAt: true,
            assigneeAgent: { select: { name: true } },
          },
        }),
      []
    ),
    safeFetch<ProjectRow[]>(
      () =>
        prisma.project.findMany({
          where: { workspaceId: id },
          include: { tasks: { select: { status: true } } },
        }),
      []
    ),
    safeFetch<LogRow[]>(
      () =>
        prisma.logEvent.findMany({
          where: { workspaceId: id },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { agent: { select: { name: true } } },
        }),
      []
    ),
  ]);

  const wsDepartments = departments.data;
  const wsAgents = agents.data;
  const wsTasks = tasks.data;
  const wsProjects = projects.data;
  const wsLogs = logs.data;

  const activeTaskCount = wsTasks.filter(
    (t) => t.status === "RUNNING" || t.status === "QUEUED"
  ).length;
  const activeProjectCount = wsProjects.filter(
    (p) => p.status === "ACTIVE"
  ).length;
  const onlineAgentCount = wsAgents.filter(
    (a) => a.status === "ONLINE" || a.status === "BUSY"
  ).length;

  const recentTasks = wsTasks.slice(0, 8);

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
            <Badge className={getWorkspaceTypeBadgeClass(workspace.type)}>
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
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
                <CardDescription>
                  Latest task activity in this workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!tasks.ok ? (
                  <SectionError label="tasks" />
                ) : recentTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks yet</p>
                ) : (
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
                      {recentTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="max-w-[240px] truncate font-medium">
                            {task.title}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {task.assigneeAgent?.name ?? "—"}
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
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {!logs.ok ? (
                  <SectionError label="activity logs" />
                ) : wsLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No recent activity
                  </p>
                ) : (
                  <div className="space-y-4">
                    {wsLogs.map((log) => (
                      <div key={log.id} className="flex gap-3">
                        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Activity className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm leading-snug line-clamp-2">
                            {log.message}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {log.agent?.name} ·{" "}
                            {formatRelativeTime(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Departments Tab ────────────────────────────────────────── */}
        <TabsContent value="departments" className="mt-6">
          {!departments.ok ? (
            <SectionError label="departments" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wsDepartments.map((dept) => (
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
                        <span>{dept._count.agents} agents</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5" />
                        <span>{dept._count.tasks} tasks</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Agents Tab ─────────────────────────────────────────────── */}
        <TabsContent value="agents" className="mt-6">
          {!agents.ok ? (
            <SectionError label="agents" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wsAgents.map((agent) => {
                const currentTask = agent.assignedTasks[0];
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
          )}
        </TabsContent>

        {/* ── Tasks Tab ──────────────────────────────────────────────── */}
        <TabsContent value="tasks" className="mt-6">
          {!tasks.ok ? (
            <SectionError label="tasks" />
          ) : (
            <Card>
              <CardContent>
                {wsTasks.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No tasks in this workspace yet
                  </p>
                ) : (
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
                      {wsTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="max-w-[280px] truncate font-medium">
                            {task.title}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {task.assigneeAgent?.name ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
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
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Projects Tab ───────────────────────────────────────────── */}
        <TabsContent value="projects" className="mt-6">
          {!projects.ok ? (
            <SectionError label="projects" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {wsProjects.map((project) => {
                const completedCount = project.tasks.filter(
                  (t) => t.status === "COMPLETED"
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
                          {completedCount}/{project.tasks.length} tasks done
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
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
                <span className="font-medium">
                  {workspace.organization.name}
                </span>

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
