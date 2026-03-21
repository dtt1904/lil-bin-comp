import { NextRequest } from "next/server";
import { store } from "@/lib/store";
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
  const approval = store.findById(store.approvals, id);
  if (!approval) return errorResponse("Approval not found", 404);

  const task = store.findById(store.tasks, approval.taskId);

  return jsonResponse({ data: { ...approval, task: task ?? null } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const approval = store.findById(store.approvals, id);
  if (!approval) return errorResponse("Approval not found", 404);

  const body = await req.json();
  const updated = store.update(store.approvals, id, body);

  return jsonResponse({ data: updated });
}
