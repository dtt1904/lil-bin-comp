export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { LogsPageClient } from "./_client";

function serialize(obj: unknown) {
  return JSON.parse(JSON.stringify(obj));
}

export default async function LogsPage() {
  const logEventsP = prisma.logEvent.findMany({
    include: {
      agent: { select: { id: true, name: true } },
      workspace: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const workspacesP = prisma.workspace.findMany({ select: { id: true, name: true } });
  const agentsP = prisma.agent.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const [logEvents, workspaces, agents] = await Promise.all([
    logEventsP.catch((err) => {
      console.error("[logs] logEvents query failed:", err);
      return [] as Awaited<typeof logEventsP>;
    }),
    workspacesP.catch((err) => {
      console.error("[logs] workspaces query failed:", err);
      return [] as Awaited<typeof workspacesP>;
    }),
    agentsP.catch((err) => {
      console.error("[logs] agents query failed:", err);
      return [] as Awaited<typeof agentsP>;
    }),
  ]);

  return (
    <LogsPageClient
      logEvents={serialize(logEvents)}
      workspaces={serialize(workspaces)}
      agents={serialize(agents)}
    />
  );
}
