export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { InvoicesPageClient } from "./_client";

export default async function InvoicesPage() {
  const invoicesP = prisma.invoiceSnapshot.findMany({
    include: {
      workspace: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const workspacesP = prisma.workspace.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const [invoices, workspaces] = await Promise.all([
    invoicesP.catch((err) => {
      console.error("[modules/invoices] invoices query failed:", err);
      return [] as Awaited<typeof invoicesP>;
    }),
    workspacesP.catch((err) => {
      console.error("[modules/invoices] workspaces query failed:", err);
      return [] as Awaited<typeof workspacesP>;
    }),
  ]);

  return (
    <InvoicesPageClient
      invoices={JSON.parse(JSON.stringify(invoices))}
      workspaces={JSON.parse(JSON.stringify(workspaces))}
    />
  );
}
