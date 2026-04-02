export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { getDashboardWorkspaceScope } from "@/lib/dashboard-workspace";
import { ChatInterface } from "./_client";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function ChatPage() {
  const { organizationId, workspaceId } = await getDashboardWorkspaceScope();

  const [workspaces, recentConversations] = await Promise.all([
    safe(
      () =>
        prisma.workspace.findMany({
          where: { organizationId },
          select: { id: true, name: true, slug: true, type: true },
          orderBy: { name: "asc" },
        }),
      []
    ),
    safe(
      () =>
        prisma.conversation.findMany({
          where: { organizationId },
          orderBy: { updatedAt: "desc" },
          take: 15,
          select: {
            id: true,
            title: true,
            workspaceId: true,
            role: true,
            updatedAt: true,
            _count: { select: { messages: true } },
          },
        }),
      []
    ),
  ]);

  return (
    <ChatInterface
      organizationId={organizationId}
      workspaceId={workspaceId}
      workspaces={workspaces}
      recentConversations={recentConversations.map((c) => ({
        id: c.id,
        title: c.title ?? "Untitled",
        workspaceId: c.workspaceId,
        role: c.role,
        updatedAt: c.updatedAt.toISOString(),
        messageCount: c._count.messages,
      }))}
    />
  );
}
