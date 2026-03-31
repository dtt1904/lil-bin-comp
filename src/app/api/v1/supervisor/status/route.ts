import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest, errorResponse } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const workspaceId = req.headers.get("x-workspace-id") ?? undefined;

  try {
    const wsFilter = workspaceId ? { workspaceId } : {};

    const [recentDecisions, health, recentTasks, activeWorkspaces] =
      await Promise.all([
        prisma.logEvent
          .findMany({
            where: {
              source: { startsWith: "supervisor:" },
              ...wsFilter,
            },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              level: true,
              source: true,
              message: true,
              metadata: true,
              workspaceId: true,
              createdAt: true,
            },
          })
          .catch(() => []),

        Promise.all([
          prisma.task.count({ where: { status: "QUEUED", ...wsFilter } }).catch(() => 0),
          prisma.task.count({ where: { status: "RUNNING", ...wsFilter } }).catch(() => 0),
          prisma.task
            .count({
              where: {
                status: "COMPLETED",
                updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                ...wsFilter,
              },
            })
            .catch(() => 0),
          prisma.task
            .count({
              where: {
                status: "FAILED",
                updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                ...wsFilter,
              },
            })
            .catch(() => 0),
        ]),

        prisma.task
          .findMany({
            where: {
              labels: { hasSome: ["supervisor:plan", "supervisor:monitor", "supervisor:report"] },
              ...wsFilter,
            },
            orderBy: { updatedAt: "desc" },
            take: 10,
            select: {
              id: true,
              title: true,
              status: true,
              labels: true,
              workspaceId: true,
              updatedAt: true,
            },
          })
          .catch(() => []),

        prisma.workspace
          .findMany({
            select: { id: true, name: true, metadata: true },
            take: 50,
          })
          .catch(() => []),
      ]);

    const [queued, running, completed24h, failed24h] = health;

    const workspacesWithSupervisor = activeWorkspaces.map((ws) => {
      const meta = (ws.metadata ?? {}) as Record<string, unknown>;
      return {
        id: ws.id,
        name: ws.name,
        supervisorEnabled: meta.useLangGraph !== false,
      };
    });

    return NextResponse.json({
      data: {
        health: { queued, running, completed24h, failed24h },
        recentSupervisorTasks: recentTasks,
        recentDecisions,
        workspaces: workspacesWithSupervisor,
        llmAvailable: !!process.env.OPENAI_API_KEY,
      },
    });
  } catch (err) {
    console.error("[supervisor/status] Error:", err);
    return errorResponse("Failed to fetch supervisor status", 500);
  }
}
