import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest, errorResponse } from "@/lib/api-auth";

/**
 * POST /api/v1/supervisor/plan
 *
 * Send an objective to the supervisor. Creates a supervisor:plan task
 * that the runner will pick up and execute via the LangGraph supervisor.
 *
 * Body: { workspaceId: string, objective: string }
 */
export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { workspaceId, objective } = body as {
      workspaceId?: string;
      objective?: string;
    };

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }
    if (!objective) {
      return errorResponse("objective is required", 400);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, organizationId: true },
    });

    if (!workspace) {
      return errorResponse(`Workspace "${workspaceId}" not found`, 404);
    }

    const task = await prisma.task.create({
      data: {
        title: `Supervisor: plan — ${workspace.name}`,
        description: objective,
        status: "QUEUED",
        priority: "HIGH",
        executionTarget: "MAC_MINI",
        organizationId: workspace.organizationId,
        workspaceId: workspace.id,
        labels: ["supervisor:plan"],
      },
      select: { id: true, title: true, status: true },
    });

    console.log(`[supervisor/plan] Created plan task ${task.id} for "${workspace.name}": "${objective}"`);

    return NextResponse.json({
      data: {
        taskId: task.id,
        title: task.title,
        status: task.status,
        workspace: workspace.name,
        objective,
        message: "Supervisor plan task queued. The runner will pick it up and create subtasks.",
      },
    });
  } catch (err) {
    console.error("[supervisor/plan] Error:", err);
    return errorResponse("Failed to create supervisor plan", 500);
  }
}
