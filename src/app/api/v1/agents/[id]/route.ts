import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { AgentStatus } from "@/generated/prisma/enums";

const VALID_STATUSES = Object.values(AgentStatus);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        assignedTasks: {
          where: { status: { in: ["RUNNING", "QUEUED"] } },
          take: 1,
        },
        taskRuns: { orderBy: { startedAt: "desc" }, take: 10 },
        costRecords: true,
      },
    });

    if (!agent) {
      return errorResponse("Agent not found", 404);
    }

    const { assignedTasks, taskRuns, costRecords, ...agentData } = agent;

    const costSummary = {
      totalCostUsd: costRecords.reduce((sum, c) => sum + c.cost, 0),
      totalInputTokens: costRecords.reduce((sum, c) => sum + c.tokensInput, 0),
      totalOutputTokens: costRecords.reduce(
        (sum, c) => sum + c.tokensOutput,
        0
      ),
      recordCount: costRecords.length,
    };

    return jsonResponse({
      data: {
        ...agentData,
        currentTask: assignedTasks[0] ?? null,
        recentTaskRuns: taskRuns,
        costSummary,
      },
    });
  } catch {
    return errorResponse("Internal error", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const {
    name,
    slug,
    description,
    model,
    provider,
    systemPrompt,
    status,
    workspaceId,
    departmentId,
    role,
    temperature,
    codename,
    avatarUrl,
  } = body as {
    name?: string;
    slug?: string;
    description?: string;
    model?: string;
    provider?: string;
    systemPrompt?: string;
    status?: string;
    workspaceId?: string;
    departmentId?: string;
    role?: string;
    temperature?: number;
    codename?: string;
    avatarUrl?: string;
  };

  if (status && !VALID_STATUSES.includes(status as AgentStatus)) {
    return errorResponse(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

  if (workspaceId) {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
      if (!workspace) {
        return errorResponse(`Workspace "${workspaceId}" not found`, 400, {
          field: "workspaceId",
        });
      }
    } catch {
      return errorResponse("Internal error", 500);
    }
  }

  if (departmentId) {
    try {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        return errorResponse(`Department "${departmentId}" not found`, 400, {
          field: "departmentId",
        });
      }
    } catch {
      return errorResponse("Internal error", 500);
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (slug !== undefined) data.slug = slug;
  if (description !== undefined) data.description = description;
  if (model !== undefined) data.model = model;
  if (provider !== undefined) data.provider = provider;
  if (systemPrompt !== undefined) data.systemPrompt = systemPrompt;
  if (status !== undefined) data.status = status as AgentStatus;
  if (workspaceId !== undefined) data.workspaceId = workspaceId;
  if (departmentId !== undefined) data.departmentId = departmentId;
  if (role !== undefined) data.role = role;
  if (temperature !== undefined) data.temperature = temperature;
  if (codename !== undefined) data.codename = codename;
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

  try {
    const updated = await prisma.agent.update({
      where: { id },
      data,
    });

    return jsonResponse({ data: updated });
  } catch (e: any) {
    if (e.code === "P2025") return errorResponse("Agent not found", 404);
    if (e.code === "P2002") {
      return errorResponse(`Agent with slug "${slug}" already exists`, 409);
    }
    return errorResponse("Internal error", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    await prisma.agent.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") return errorResponse("Agent not found", 404);
    return errorResponse("Internal error", 500);
  }
}
