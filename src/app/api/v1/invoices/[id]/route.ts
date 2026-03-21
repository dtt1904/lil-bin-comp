import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";
import { InvoiceStatus, LogLevel } from "@/generated/prisma/enums";

const VALID_STATUSES = Object.values(InvoiceStatus);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const invoice = await prisma.invoiceSnapshot.findUnique({ where: { id } });
    if (!invoice) return errorResponse("Invoice not found", 404);

    return jsonResponse({ data: invoice });
  } catch (err) {
    return errorResponse("Failed to fetch invoice", 500, {
      message: (err as Error).message,
    });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (
    body.status !== undefined &&
    !VALID_STATUSES.includes(body.status as InvoiceStatus)
  ) {
    return errorResponse(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

  try {
    const existing = await prisma.invoiceSnapshot.findUnique({
      where: { id },
    });
    if (!existing) return errorResponse("Invoice not found", 404);

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.dueDate !== undefined) data.dueDate = new Date(body.dueDate as string);
    if (body.paidAt !== undefined) data.paidAt = new Date(body.paidAt as string);
    if (body.customerName !== undefined) data.customerName = body.customerName;
    if (body.customerEmail !== undefined) data.customerEmail = body.customerEmail;
    if (body.notes !== undefined) data.items = { notes: body.notes };
    if (body.items !== undefined) data.items = body.items;

    if (body.status === InvoiceStatus.PAID && !body.paidAt) {
      data.paidAt = new Date();
    }

    const updated = await prisma.invoiceSnapshot.update({
      where: { id },
      data,
    });

    if (body.status && body.status !== existing.status) {
      await prisma.logEvent.create({
        data: {
          organizationId: existing.organizationId,
          workspaceId: existing.workspaceId,
          level: LogLevel.INFO,
          source: "api",
          message: `Invoice ${existing.invoiceNumber} status: ${existing.status} → ${body.status}`,
          metadata: { invoiceId: id, from: existing.status, to: body.status },
        },
      });
    }

    return jsonResponse({ data: updated });
  } catch (err) {
    return errorResponse("Failed to update invoice", 500, {
      message: (err as Error).message,
    });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const existing = await prisma.invoiceSnapshot.findUnique({
      where: { id },
    });
    if (!existing) return errorResponse("Invoice not found", 404);

    await prisma.invoiceSnapshot.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse("Failed to delete invoice", 500, {
      message: (err as Error).message,
    });
  }
}
