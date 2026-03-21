import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return errorResponse("Task not found", 404);

    const comments = await prisma.comment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
    });

    return jsonResponse({ data: comments, meta: { total: comments.length } });
  } catch (err) {
    return errorResponse(`Failed to fetch comments: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return errorResponse("Task not found", 404);

    const body = await req.json();

    if (!body.content) {
      return errorResponse("content is required");
    }

    if (body.userId) {
      const user = await prisma.user.findUnique({ where: { id: body.userId } });
      if (!user) return errorResponse("User not found", 404);
    }
    if (body.agentId) {
      const agent = await prisma.agent.findUnique({ where: { id: body.agentId } });
      if (!agent) return errorResponse("Agent not found", 404);
    }

    const comment = await prisma.comment.create({
      data: {
        taskId: id,
        authorUserId: body.userId ?? undefined,
        authorAgentId: body.agentId ?? undefined,
        content: body.content,
      },
    });

    return jsonResponse({ data: comment }, 201);
  } catch (err) {
    return errorResponse(`Failed to create comment: ${err instanceof Error ? err.message : err}`, 500);
  }
}
