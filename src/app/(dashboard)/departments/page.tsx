export const dynamic = "force-dynamic";
import Link from "next/link";
import { Plus, Users, ListChecks, FolderKanban, Bot } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAgentAvatarColor } from "@/lib/helpers";
import { cn } from "@/lib/utils";

const ACTIVE_TASK_STATUSES = ["RUNNING", "QUEUED", "BLOCKED", "AWAITING_APPROVAL"];

export default async function DepartmentsPage() {
  const [departments, workspaces] = await Promise.all([
    prisma.department.findMany({
      include: {
        workspace: { select: { id: true, name: true, type: true } },
        manager: { select: { id: true, name: true } },
        agents: { select: { id: true, name: true } },
        tasks: { select: { id: true, status: true, projectId: true } },
        projects: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.workspace.findMany({
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const deptsByWorkspace = workspaces.map((ws) => ({
    workspace: ws,
    departments: departments.filter((d) => d.workspaceId === ws.id),
  })).filter((g) => g.departments.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Departments
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {departments.length} departments across {workspaces.length} workspaces
            </p>
          </div>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Department
          </Button>
        </div>

        {/* Grouped by workspace */}
        <div className="space-y-10">
          {deptsByWorkspace.map(({ workspace, departments: depts }) => (
            <section key={workspace.id}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                  <span className="text-sm font-bold text-accent-foreground">
                    {workspace.name[0]}
                  </span>
                </div>
                <div>
                  <h2 className="text-base font-semibold">{workspace.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {depts.length} department{depts.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-2 text-[10px] uppercase tracking-wider">
                  {workspace.type}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {depts.map((dept) => {
                  const activeTasks = dept.tasks.filter((t) =>
                    ACTIVE_TASK_STATUSES.includes(t.status)
                  );
                  const projectIds = new Set(
                    dept.tasks.filter((t) => t.projectId).map((t) => t.projectId)
                  );

                  return (
                    <Link key={dept.id} href={`/departments/${dept.id}`}>
                      <Card className="group cursor-pointer transition-all hover:ring-2 hover:ring-primary/20">
                        <CardContent className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold tracking-tight group-hover:text-primary transition-colors">
                                {dept.name}
                              </h3>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {dept.workspace.name}
                              </p>
                            </div>
                            {dept.manager && (
                              <Avatar size="sm">
                                <AvatarFallback
                                  className={cn(
                                    getAgentAvatarColor(dept.manager.name),
                                    "text-[10px] font-bold text-white"
                                  )}
                                >
                                  {dept.manager.name[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>

                          {dept.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {dept.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 pt-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Bot className="h-3.5 w-3.5" />
                              <span>{dept.agents.length}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <ListChecks className="h-3.5 w-3.5" />
                              <span>{activeTasks.length} active</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <FolderKanban className="h-3.5 w-3.5" />
                              <span>{dept.projects.length}</span>
                            </div>
                          </div>

                          {dept.manager && (
                            <div className="flex items-center gap-2 border-t border-border pt-3">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Lead: <span className="text-foreground">{dept.manager.name}</span>
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
