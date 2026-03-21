export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { ApprovalsPageClient } from "./_client";

function serialize(obj: unknown) {
  return JSON.parse(JSON.stringify(obj));
}

export default async function ApprovalsPage() {
  const [approvals, workspaces] = await Promise.all([
    prisma.approval.findMany({
      include: {
        requestedBy: { select: { id: true, name: true, slug: true } },
        reviewedBy: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, status: true, priority: true, workspaceId: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspace.findMany({ select: { id: true, name: true } }),
  ]);

  return (
    <ApprovalsPageClient
      approvals={serialize(approvals)}
      workspaces={serialize(workspaces)}
    />
  );
}
