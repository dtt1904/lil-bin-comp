import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const prompt = await prisma.promptTemplate.findUnique({ where: { id } });
    if (!prompt) return errorResponse("Prompt template not found", 404);

    return jsonResponse({ data: prompt });
  } catch (err) {
    return errorResponse(`Failed to fetch prompt: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const existing = await prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing) return errorResponse("Prompt template not found", 404);

    const body = await req.json();
    const updated = await prisma.promptTemplate.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.template !== undefined && { template: body.template }),
        ...(body.variables !== undefined && { variables: body.variables }),
        ...(body.visibility !== undefined && { visibility: body.visibility }),
        ...(body.tags !== undefined && { tags: body.tags }),
      },
    });

    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse(`Failed to update prompt: ${err instanceof Error ? err.message : err}`, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const existing = await prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing) return errorResponse("Prompt template not found", 404);

    await prisma.promptTemplate.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse(`Failed to delete prompt: ${err instanceof Error ? err.message : err}`, 500);
  }
}
