import Link from "next/link";
import { Building2, Users, Bot, ListChecks, FolderKanban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Workspace } from "@/lib/types";
import { WorkspaceType, TaskStatus, ProjectStatus } from "@/lib/types";
import { departments, agents, tasks, projects } from "@/lib/mock-data";
import { formatRelativeTime } from "@/lib/helpers";

export function getWorkspaceTypeBadgeClass(type: WorkspaceType): string {
  const map: Record<string, string> = {
    HQ: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    CLIENT: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    INTERNAL: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  };
  return map[type] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
}

interface WorkspaceCardProps {
  workspace: Workspace;
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const deptCount = departments.filter(
    (d) => d.workspaceId === workspace.id
  ).length;
  const agentCount = agents.filter(
    (a) => a.workspaceId === workspace.id
  ).length;
  const activeTaskCount = tasks.filter(
    (t) =>
      t.workspaceId === workspace.id &&
      (t.status === TaskStatus.RUNNING || t.status === TaskStatus.QUEUED)
  ).length;
  const activeProjectCount = projects.filter(
    (p) =>
      p.workspaceId === workspace.id && p.status === ProjectStatus.ACTIVE
  ).length;

  const stats = [
    { label: "Departments", value: deptCount, icon: Users },
    { label: "Agents", value: agentCount, icon: Bot },
    { label: "Active Tasks", value: activeTaskCount, icon: ListChecks },
    { label: "Projects", value: activeProjectCount, icon: FolderKanban },
  ];

  return (
    <Link href={`/workspaces/${workspace.id}`} className="block">
      <Card className="group cursor-pointer transition-all hover:ring-foreground/20">
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight group-hover:text-primary transition-colors">
                  {workspace.name}
                </h3>
                <p className="text-xs text-muted-foreground">Trung AI Ops</p>
              </div>
            </div>
            <Badge className={getWorkspaceTypeBadgeClass(workspace.type)}>
              {workspace.type}
            </Badge>
          </div>

          {workspace.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {workspace.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 text-sm"
              >
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-muted-foreground">{stat.label}</span>
                <span className="ml-auto font-medium tabular-nums">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
            <span>Created {formatRelativeTime(workspace.createdAt)}</span>
            <span className="text-primary/60 opacity-0 transition-opacity group-hover:opacity-100">
              View workspace →
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
