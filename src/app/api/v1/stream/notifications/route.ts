import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateStreamRequest } from "@/lib/api-auth";
import { createSseResponse } from "@/lib/sse";
import {
  readStreamWorkspaceId,
  validateStreamWorkspace,
} from "@/lib/stream-workspace";

export const dynamic = "force-dynamic";

async function loadNotifications(organizationId: string, workspaceId?: string) {
  const scope =
    workspaceId ?
      {
        organizationId,
        OR: [{ workspaceId }, { workspaceId: null }],
      }
    : { organizationId };

  const [unreadCount, recent] = await Promise.all([
    prisma.notification.count({
      where: { ...scope, read: false },
    }),
    prisma.notification.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        message: true,
        severity: true,
        read: true,
        link: true,
        createdAt: true,
      },
    }),
  ]);

  return { unreadCount, recent };
}

export async function GET(req: NextRequest) {
  const auth = authenticateStreamRequest(req);
  if (!auth.ok) return auth.response;

  const requestedWs = readStreamWorkspaceId(req);
  const workspaceId = await validateStreamWorkspace(
    requestedWs,
    auth.ctx.organizationId
  );
  if (requestedWs && !workspaceId) {
    return NextResponse.json({ error: "Invalid workspaceId for stream" }, { status: 403 });
  }

  return createSseResponse((send) => {
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      try {
        send("notifications", {
          data: await loadNotifications(auth.ctx.organizationId, workspaceId),
        });
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : String(err) });
      }
    };

    void tick();
    const id = setInterval(() => void tick(), 4000);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  });
}
