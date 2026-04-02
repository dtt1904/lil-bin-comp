import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest, errorResponse } from "@/lib/api-auth";
import { chatWithSupervisor } from "@/lib/langgraph/supervisor-chat";
import { runWorkspaceAgent } from "@/lib/langgraph/workspace-agent";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/default-organization";

/**
 * POST /api/v1/chat
 *
 * Unified chat endpoint.
 * - No workspaceId → CEO talking to lil_Bin (supervisor)
 * - With workspaceId → workspace owner/manager talking to workspace agent
 *
 * Body: { message: string, workspaceId?: string, conversationId?: string }
 *
 * Returns: { data: { conversationId, response, metadata } }
 */
export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { message, workspaceId, conversationId } = body as {
      message?: string;
      workspaceId?: string;
      conversationId?: string;
    };

    if (!message?.trim()) return errorResponse("message is required", 400);

    const orgId = auth.ctx.organizationId || DEFAULT_ORGANIZATION_ID;

    let convId = conversationId;
    if (!convId) {
      const conv = await prisma.conversation.create({
        data: {
          title: message.slice(0, 60),
          organizationId: orgId,
          workspaceId: workspaceId || null,
          role: workspaceId ? "owner" : "ceo",
        },
        select: { id: true },
      });
      convId = conv.id;
    }

    await prisma.chatMessage.create({
      data: {
        conversationId: convId,
        role: "USER",
        content: message,
      },
    });

    let responseText: string;
    let metadata: Record<string, unknown> = {};

    if (!workspaceId) {
      const result = await chatWithSupervisor(prisma, {
        organizationId: orgId,
        message,
      });

      responseText = result.response;
      metadata = {
        agent: "lil_Bin",
        intent: result.intent,
        workspacesScanned: result.allWorkspaces.length,
        delegations: result.delegationResults.map((d) => ({
          workspace: d.workspaceName,
          intent: d.intent,
          department: d.department,
          actions: d.actions.length,
        })),
      };
    } else {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true, organizationId: true },
      });

      if (!workspace) return errorResponse(`Workspace "${workspaceId}" not found`, 404);

      const result = await runWorkspaceAgent(prisma, {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        organizationId: workspace.organizationId,
        message,
        role: "owner",
      });

      responseText = result.response;
      metadata = {
        agent: `${workspace.name} Agent`,
        intent: result.intent,
        department: result.targetDepartment,
        actions: result.actions.map((a) => ({ type: a.type, description: a.description })),
      };
    }

    await prisma.chatMessage.create({
      data: {
        conversationId: convId,
        role: "ASSISTANT",
        content: responseText,
        metadata: metadata as Record<string, string | number | boolean | null>,
      },
    });

    return NextResponse.json({
      data: {
        conversationId: convId,
        response: responseText,
        metadata,
      },
    });
  } catch (err) {
    console.error("[chat] Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to process chat";
    return errorResponse(msg, 500);
  }
}

/**
 * GET /api/v1/chat?conversationId=xxx
 *
 * Fetch conversation history. If no conversationId, list recent conversations.
 */
export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const orgId = auth.ctx.organizationId || DEFAULT_ORGANIZATION_ID;
  const convId = req.nextUrl.searchParams.get("conversationId");

  try {
    if (convId) {
      const messages = await prisma.chatMessage.findMany({
        where: { conversationId: convId },
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, metadata: true, createdAt: true },
      });
      return NextResponse.json({ data: { conversationId: convId, messages } });
    }

    const conversations = await prisma.conversation.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        workspaceId: true,
        role: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ data: conversations });
  } catch (err) {
    console.error("[chat] GET error:", err);
    return errorResponse("Failed to fetch conversations", 500);
  }
}
