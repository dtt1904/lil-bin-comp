import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateStreamRequest } from "@/lib/api-auth";
import { createSseResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

async function loadTasks(organizationId: string) {
  return prisma.task.findMany({
    where: { organizationId },
    include: {
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

  return createSseResponse((send) => {
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      try {
        const tasks = await loadTasks(auth.ctx.organizationId);
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
