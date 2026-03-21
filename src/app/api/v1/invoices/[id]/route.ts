import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { InvoiceStatus, LogLevel } from "@/lib/types";

const VALID_STATUSES = Object.values(InvoiceStatus);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const invoice = store.findById(store.invoiceSnapshots, id);
  if (!invoice) return errorResponse("Invoice not found", 404);

  return jsonResponse({ data: invoice });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.invoiceSnapshots, id);
  if (!existing) return errorResponse("Invoice not found", 404);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status as InvoiceStatus)) {
    return errorResponse(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };

  const allowedFields = ["status", "amount", "dueDate", "paidAt", "notes", "stripePaymentId"];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = (field === "dueDate" || field === "paidAt")
        ? new Date(body[field] as string)
        : body[field];
    }
  }

  if (body.status === InvoiceStatus.PAID && !body.paidAt) {
    updates.paidAt = now;
  }

  const updated = store.update(store.invoiceSnapshots, id, updates);

  if (body.status && body.status !== existing.status) {
    store.insert(store.logEvents, {
      id: generateId("log"),
      organizationId: auth.ctx.organizationId,
      workspaceId: existing.workspaceId,
      level: LogLevel.INFO,
      message: `Invoice ${existing.invoiceNumber} status: ${existing.status} → ${body.status}`,
      metadata: { invoiceId: id, from: existing.status, to: body.status },
      timestamp: now,
    });
  }

  return jsonResponse({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = store.findById(store.invoiceSnapshots, id);
  if (!existing) return errorResponse("Invoice not found", 404);

  store.remove(store.invoiceSnapshots, id);
  return jsonResponse({ success: true });
}
