import type { PrismaClient } from "@/generated/prisma/client";
import {
  AgentStatus,
  ModuleStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "@/generated/prisma/enums";
import type { WorkspaceTemplateId } from "./types";
import { getWorkspaceTemplate } from "./definitions";

function interpolateWorkspaceName(
  template: string,
  workspaceName: string
): string {
  return template.replace(/\{\{\s*workspaceName\s*\}\}/g, workspaceName);
}

function makeScopedSlug(workspaceSlug: string, base: string, maxLen = 48): string {
  const raw = `${workspaceSlug}-${base}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return raw.slice(0, maxLen).replace(/-+$/g, "") || base;
}

export async function applyWorkspaceTemplate(
  db: PrismaClient,
  params: {
    organizationId: string;
    workspaceId: string;
    workspaceSlug: string;
    workspaceName: string;
    templateId: WorkspaceTemplateId;
  }
): Promise<void> {
  const tpl = getWorkspaceTemplate(params.templateId);
  if (!tpl) {
    throw new Error(`Unknown template: ${params.templateId}`);
  }

  const deptIds = new Map<string, string>();

  await db.$transaction(async (tx) => {
    for (const d of tpl.departments) {
      const row = await tx.department.create({
        data: {
          organizationId: params.organizationId,
          workspaceId: params.workspaceId,
          name: d.name,
          slug: d.slug,
          description: d.description,
        },
        select: { id: true },
      });
      deptIds.set(d.slug, row.id);
    }

    for (const m of tpl.modules) {
      await tx.moduleInstallation.upsert({
        where: {
          moduleType_workspaceId: {
            moduleType: m.moduleType,
            workspaceId: params.workspaceId,
          },
        },
        create: {
          organizationId: params.organizationId,
          workspaceId: params.workspaceId,
          moduleType: m.moduleType,
          status: ModuleStatus.ACTIVE,
        },
        update: {},
        select: { id: true },
      });
    }

    for (const a of tpl.agents) {
      const slug = makeScopedSlug(params.workspaceSlug, a.slugBase);
      const departmentId = a.departmentSlug
        ? deptIds.get(a.departmentSlug)
        : undefined;
      await tx.agent.create({
        data: {
          organizationId: params.organizationId,
          workspaceId: params.workspaceId,
          departmentId,
          name: a.name,
          slug,
          role: a.role,
          description: a.description,
          model: a.model,
          provider: a.provider,
          systemPrompt: interpolateWorkspaceName(
            a.systemPrompt,
            params.workspaceName
          ),
          status: AgentStatus.OFFLINE,
        },
        select: { id: true },
      });
    }

    let projectId: string | null = null;
    if (tpl.starterProject) {
      const p = tpl.starterProject;
      const projectSlug = makeScopedSlug(params.workspaceSlug, p.slugBase, 40);
      const departmentId = p.departmentSlug
        ? deptIds.get(p.departmentSlug)
        : undefined;
      const created = await tx.project.create({
        data: {
          organizationId: params.organizationId,
          workspaceId: params.workspaceId,
          name: p.name,
          slug: projectSlug,
          description: p.description,
          status: ProjectStatus.ACTIVE,
          departmentId,
        },
        select: { id: true },
      });
      projectId = created.id;
    }

    for (const t of tpl.starterTasks) {
      const departmentId = t.departmentSlug
        ? deptIds.get(t.departmentSlug)
        : undefined;
      const priority =
        t.priority === "LOW" ||
        t.priority === "MEDIUM" ||
        t.priority === "HIGH"
          ? TaskPriority[t.priority]
          : TaskPriority.MEDIUM;

      await tx.task.create({
        data: {
          organizationId: params.organizationId,
          workspaceId: params.workspaceId,
          projectId: projectId ?? undefined,
          departmentId,
          title: t.title,
          description: t.description,
          status: TaskStatus.BACKLOG,
          priority,
        },
        select: { id: true },
      });
    }
  });
}
