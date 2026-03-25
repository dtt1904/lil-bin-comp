import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateStreamRequest } from "@/lib/api-auth";
import { createSseResponse } from "@/lib/sse";
import {
  readStreamWorkspaceId,
  validateStreamWorkspace,
} from "@/lib/stream-workspace";

export const dynamic = "force-dynamic";

async function loadTasks(organizationId: string, workspaceId?: string) {
  return prisma.task.findMany({
    where: {
      organizationId,
      ...(workspaceId ? { workspaceId } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      labels: true,
      organizationId: true,
      workspaceId: true,
      departmentId: true,
      projectId: true,
      assigneeAgentId: true,
      createdAt: true,
      updatedAt: true,
      assigneeAgent: { select: { id: true, name: true, slug: true } },
      workspace: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });
}

export async function GET(req: NextRequest) {
  const auth = authenticateStreamRequest(req);
  if (!auth.ok) return auth.response;

  const requestedWs = readStreamWorkspaceId(req);
  const workspaceId = await validateStreamWorkspace(
    requestedWs,
    auth.ctx.organizationId
  );
  if (requestedWs && !workspaceId) {
    return NextResponse.json({ error: "Invalid workspaceId for stream" }, { status: 403 });
  }

  return createSseResponse((send) => {
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      try {
        const tasks = await loadTasks(auth.ctx.organizationId, workspaceId);
        send("tasks", { data: tasks });
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    };

    void tick();
    const id = setInterval(() => void tick(), 3000);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  });
}
