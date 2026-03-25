import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateStreamRequest } from "@/lib/api-auth";
import { createSseResponse } from "@/lib/sse";
import {
  readStreamWorkspaceId,
  validateStreamWorkspace,
} from "@/lib/stream-workspace";

export const dynamic = "force-dynamic";

async function loadInvoices(organizationId: string, workspaceId?: string) {
  const now = Date.now();
  const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1);

  const invoices = await prisma.invoiceSnapshot.findMany({
    where: {
      organizationId,
      ...(workspaceId ? { workspaceId } : {}),
    },
    include: {
      workspace: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  const totalOutstanding = invoices
    .filter((inv) => inv.status === "SENT" || inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = invoices
    .filter((inv) => inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const paidThisMonth = invoices
    .filter((inv) => inv.status === "PAID" && inv.paidAt && inv.paidAt >= monthStart)
    .reduce((sum, inv) => sum + inv.amount, 0);

  return {
    invoices,
    summary: {
      totalOutstanding,
      overdueAmount,
      paidThisMonth,
      totalInvoices: invoices.length,
    },
  };
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
        send("invoices", {
          data: await loadInvoices(auth.ctx.organizationId, workspaceId),
        });
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : String(err) });
      }
    };

    void tick();
    const id = setInterval(() => void tick(), 5000);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  });
}
