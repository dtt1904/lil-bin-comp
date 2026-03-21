import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Cpu,
  HardDrive,
  Shield,
  Database,
  DollarSign,
  Eye,
  Building2,
  Network,
  Zap,
  Clock,
  Terminal,
  Activity,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  agents,
  workspaces,
  departments,
  tasks,
  taskRuns,
  logEvents,
  costRecords,
  agentPermissions,
  agentHeartbeats,
  memoryEntries,
} from "@/lib/mock-data";
import { TaskStatus } from "@/lib/types";
import {
  formatRelativeTime,
  formatCurrency,
  getStatusColor,
  getAgentStatusDotColor,
  getAgentAvatarColor,
  getAgentStatusColor,
  getPriorityColor,
} from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { AgentHeader } from "@/components/agents/agent-header";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = agents.find((a) => a.id === id);

  if (!agent) {
    notFound();
  }

  const workspace = workspaces.find((w) => w.id === agent.workspaceId);
  const department = departments.find((d) => d.id === agent.departmentId);
  const heartbeat = agentHeartbeats.find((h) => h.agentId === agent.id);
  const permissions = agentPermissions.filter((p) => p.agentId === agent.id);

  const agentTasks = tasks
    .filter((t) => t.agentId === agent.id)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const currentTask = agentTasks.find(
    (t) => t.status === TaskStatus.RUNNING
  );
  const agentRuns = taskRuns
    .filter((r) => r.agentId === agent.id)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  const agentLogs = logEvents
    .filter((l) => l.agentId === agent.id)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);
  const agentCosts = costRecords.filter((c) => c.agentId === agent.id);

  const totalCost = agentCosts.reduce((sum, c) => sum + c.costUsd, 0);
  const totalInputTokens = agentCosts.reduce(
    (sum, c) => sum + c.inputTokens,
    0
  );
  const totalOutputTokens = agentCosts.reduce(
    (sum, c) => sum + c.outputTokens,
    0
  );

  const agentMemories = memoryEntries.filter(
    (m) =>
      m.workspaceId === agent.workspaceId ||
      m.visibility === "GLOBAL"
  );

  const logLevelColor: Record<string, string> = {
    DEBUG: "text-zinc-500",
    INFO: "text-blue-400",
    WARN: "text-amber-400",
    ERROR: "text-red-400",
    CRITICAL: "text-red-500",
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/agents"
          className="transition-colors hover:text-foreground"
        >
          Agents
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{agent.name}</span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left Column ──────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Agent Header */}
          <AgentHeader agent={agent} />

          <Separator />

          {/* System Prompt */}
          {agent.systemPrompt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Terminal className="h-4 w-4" />
                  System Prompt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground select-none">
                    <span className="ml-1">
                      Click to expand prompt
                    </span>
                  </summary>
                  <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/80">
                      {agent.systemPrompt}
                    </pre>
                  </div>
                </details>
              </CardContent>
            </Card>
          )}

          {/* Current Task */}
          {currentTask && (
            <Card className="ring-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-blue-400" />
                  Current Task
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <h3 className="font-medium">{currentTask.title}</h3>
                {currentTask.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {currentTask.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Badge
                    className={cn("text-xs", getStatusColor(currentTask.status))}
                  >
                    {currentTask.status}
                  </Badge>
                  <Badge
                    className={cn(
                      "text-xs",
                      getPriorityColor(currentTask.priority)
                    )}
                  >
                    {currentTask.priority}
                  </Badge>
                  <span>Updated {formatRelativeTime(currentTask.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task History */}
          <Card>
            <CardHeader>
              <CardTitle>Task History</CardTitle>
              <CardDescription>
                {agentTasks.length} total tasks assigned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentTasks.slice(0, 10).map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="max-w-[300px] truncate font-medium">
                        {task.title}
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
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs",
                            getPriorityColor(task.priority)
                          )}
                        >
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(task.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agentLogs.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No recent activity
                  </p>
                )}
                {agentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 font-mono text-[10px] font-semibold uppercase",
                        logLevelColor[log.level]
                      )}
                    >
                      {log.level}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{log.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatRelativeTime(log.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Status & Health */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status & Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      getAgentStatusDotColor(agent.status)
                    )}
                  />
                  <span
                    className={cn(
                      "font-medium",
                      getAgentStatusColor(agent.status)
                    )}
                  >
                    {agent.status}
                  </span>
                </div>
              </div>
              {heartbeat && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Cpu className="h-3.5 w-3.5" />
                      CPU
                    </span>
                    <span className="tabular-nums">{heartbeat.cpuPercent}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <HardDrive className="h-3.5 w-3.5" />
                      Memory
                    </span>
                    <span className="tabular-nums">{heartbeat.memoryMb} MB</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Last Active
                </span>
                <span>
                  {agent.lastActiveAt
                    ? formatRelativeTime(agent.lastActiveAt)
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium capitalize">
                  {agent.provider === "openai" ? "OpenAI" : "Anthropic"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Model</span>
                <span className="font-mono text-xs">{agent.model}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Temperature</span>
                <span className="tabular-nums">0.7</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Visibility</span>
                <Badge variant="outline" className="text-xs">
                  {agent.visibility}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  Workspace
                </span>
                <span className="font-medium">
                  {workspace ? (
                    <Link
                      href={`/workspaces/${workspace.id}`}
                      className="text-primary transition-colors hover:underline"
                    >
                      {workspace.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Global</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Network className="h-3.5 w-3.5" />
                  Department
                </span>
                <span>{department?.name ?? "—"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Memory & Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Database className="h-3.5 w-3.5" />
                Memory & Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">
                  Memory scope: {agentMemories.length} entries accessible
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary" className="text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cost Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="h-3.5 w-3.5" />
                Cost Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(totalCost)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Input Tokens</span>
                <span className="tabular-nums">
                  {totalInputTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Output Tokens</span>
                <span className="tabular-nums">
                  {totalOutputTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Task Runs</span>
                <span className="tabular-nums">{agentRuns.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          {permissions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-3.5 w-3.5" />
                  Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {permissions.map((perm) => {
                    const permWs = workspaces.find(
                      (w) => w.id === perm.workspaceId
                    );
                    return (
                      <div key={perm.id} className="space-y-1">
                        <p className="text-sm font-medium">
                          {permWs?.name ?? perm.workspaceId}
                        </p>
                        <div className="flex gap-1.5">
                          {perm.canRead && (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              Read
                            </Badge>
                          )}
                          {perm.canWrite && (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              Write
                            </Badge>
                          )}
                          {perm.canExecute && (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              Execute
                            </Badge>
                          )}
                          {perm.canApprove && (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              Approve
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
