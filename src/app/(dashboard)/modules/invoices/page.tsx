export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { InvoicesPageClient } from "./_client";

export default async function InvoicesPage() {
  const [invoices, workspaces] = await Promise.all([
    prisma.invoiceSnapshot.findMany({
      include: {
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspace.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <InvoicesPageClient
      invoices={JSON.parse(JSON.stringify(invoices))}
      workspaces={JSON.parse(JSON.stringify(workspaces))}
    />
  );
}
