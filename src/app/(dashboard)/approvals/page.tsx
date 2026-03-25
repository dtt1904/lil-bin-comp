export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { ApprovalsPageClient } from "./_client";

function serialize(obj: unknown) {
  return JSON.parse(JSON.stringify(obj));
}

export default async function ApprovalsPage() {
  const approvalsP = prisma.approval.findMany({
    include: {
      requestedBy: { select: { id: true, name: true, slug: true } },
      reviewedBy: { select: { id: true, name: true } },
      task: { select: { id: true, title: true, status: true, priority: true, workspaceId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const workspacesP = prisma.workspace.findMany({ select: { id: true, name: true } });

  const [approvals, workspaces] = await Promise.all([
    approvalsP.catch((err) => {
      console.error("[approvals] approvals query failed:", err);
      return [] as Awaited<typeof approvalsP>;
    }),
    workspacesP.catch((err) => {
      console.error("[approvals] workspaces query failed:", err);
      return [] as Awaited<typeof workspacesP>;
    }),
  ]);

  return (
    <ApprovalsPageClient
      approvals={serialize(approvals)}
      workspaces={serialize(workspaces)}
    />
  );
}
