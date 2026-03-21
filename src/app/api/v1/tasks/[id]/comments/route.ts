import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
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
  const task = store.findById(store.tasks, id);
  if (!task) return errorResponse("Task not found", 404);

  const comments = store.filter(store.comments, (c) => c.taskId === id);
  return jsonResponse({ data: comments, meta: { total: comments.length } });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const task = store.findById(store.tasks, id);
  if (!task) return errorResponse("Task not found", 404);

  const body = await req.json();

  if (!body.content) {
    return errorResponse("content is required");
  }

  if (body.userId) {
    const user = store.findById(store.users, body.userId);
    if (!user) return errorResponse("User not found", 404);
  }
  if (body.agentId) {
    const agent = store.findById(store.agents, body.agentId);
    if (!agent) return errorResponse("Agent not found", 404);
  }

  const now = new Date();
  const comment = store.insert(store.comments, {
    id: generateId("comment"),
    taskId: id,
    userId: body.userId ?? undefined,
    agentId: body.agentId ?? undefined,
    content: body.content,
    createdAt: now,
    updatedAt: now,
  });

  return jsonResponse({ data: comment }, 201);
}
