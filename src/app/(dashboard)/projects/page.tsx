export const dynamic = "force-dynamic";
import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRelativeTime } from "@/lib/helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const PROJECT_STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  PAUSED: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  ARCHIVED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    include: {
      workspace: { select: { id: true, name: true } },
      tasks: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? "s" : ""} across all workspaces
            </p>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Create Project
          </Button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const total = project.tasks.length;
            const completed = project.tasks.filter((t) => t.status === "COMPLETED").length;
            const running = project.tasks.filter((t) => t.status === "RUNNING").length;
            const blocked = project.tasks.filter((t) => t.status === "BLOCKED").length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="block">
                <Card className="group transition-all hover:border-border hover:bg-muted/20">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <FolderKanban className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold group-hover:text-foreground/90">
                            {project.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {project.workspace?.name ?? "Unknown"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("shrink-0", PROJECT_STATUS_COLOR[project.status])}
                      >
                        {project.status}
                      </Badge>
                    </div>

                    {project.description && (
                      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {project.description}
                      </p>
                    )}

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Progress</span>
                        <span className="text-xs font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>

                    {/* Task Counts */}
                    <div className="mb-3 flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{total}</span> total
                      </span>
                      {completed > 0 && (
                        <span className="text-emerald-400">
                          <span className="font-medium">{completed}</span> done
                        </span>
                      )}
                      {running > 0 && (
                        <span className="text-blue-400">
                          <span className="font-medium">{running}</span> running
                        </span>
                      )}
                      {blocked > 0 && (
                        <span className="text-red-400">
                          <span className="font-medium">{blocked}</span> blocked
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-border/50 pt-3">
                      <span className="text-[11px] text-muted-foreground">
                        Created {formatRelativeTime(project.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
