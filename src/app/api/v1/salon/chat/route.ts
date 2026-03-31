import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest, errorResponse } from "@/lib/api-auth";

/**
 * POST /api/v1/salon/chat
 *
 * Salon owner sends a message to their salon's AI agent.
 * Creates a salon:chat task that the runner picks up and processes
 * via the LangGraph salon sub-graph.
 *
 * Body: { workspaceId: string, message: string }
 */
export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { workspaceId, message } = body as {
      workspaceId?: string;
      message?: string;
    };

    if (!workspaceId) return errorResponse("workspaceId is required", 400);
    if (!message || !message.trim()) return errorResponse("message is required", 400);

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, organizationId: true },
    });

    if (!workspace) return errorResponse(`Workspace "${workspaceId}" not found`, 404);

    const task = await prisma.task.create({
      data: {
        title: `Salon chat: ${message.slice(0, 60)}`,
        description: message,
        status: "QUEUED",
        priority: "HIGH",
        executionTarget: "MAC_MINI",
        organizationId: workspace.organizationId,
        workspaceId: workspace.id,
        labels: ["salon:chat"],
      },
      select: { id: true, title: true, status: true },
    });

    console.log(`[salon/chat] Created chat task ${task.id} for "${workspace.name}"`);

    return NextResponse.json({
      data: {
        taskId: task.id,
        status: task.status,
        workspace: workspace.name,
        message: "Your message has been received. The salon agent will process it shortly.",
      },
    });
  } catch (err) {
    console.error("[salon/chat] Error:", err);
    return errorResponse("Failed to process chat message", 500);
  }
}
