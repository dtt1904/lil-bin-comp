export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { LogsPageClient } from "./_client";

function serialize(obj: unknown) {
  return JSON.parse(JSON.stringify(obj));
}

export default async function LogsPage() {
  const [logEvents, workspaces, agents] = await Promise.all([
    prisma.logEvent.findMany({
      include: {
        agent: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.workspace.findMany({ select: { id: true, name: true } }),
    prisma.agent.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <LogsPageClient
      logEvents={serialize(logEvents)}
      workspaces={serialize(workspaces)}
      agents={serialize(agents)}
    />
  );
}
