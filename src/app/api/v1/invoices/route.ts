import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { InvoiceStatus } from "@/generated/prisma/enums";

const VALID_STATUSES = Object.values(InvoiceStatus);

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const offset = parseInt(params.offset || "0", 10) || 0;

  try {
    const where: Record<string, unknown> = {};

    if (params.workspaceId) where.workspaceId = params.workspaceId;
    if (params.status) {
      if (!VALID_STATUSES.includes(params.status as InvoiceStatus)) {
        return errorResponse(
          `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
          400
        );
      }
      where.status = params.status as InvoiceStatus;
    }
    if (params.customerName) {
      where.customerName = {
        contains: params.customerName,
        mode: "insensitive",
      };
    }
    if (params.overdue === "true") {
      where.OR = [
        { status: InvoiceStatus.OVERDUE },
        {
          status: InvoiceStatus.SENT,
          dueDate: { lt: new Date() },
        },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.invoiceSnapshot.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoiceSnapshot.count({ where }),
    ]);

    return jsonResponse({ data, meta: { total, limit, offset } });
  } catch (err) {
    return errorResponse("Failed to fetch invoices", 500, {
      message: (err as Error).message,
    });
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { workspaceId, invoiceNumber, customerName, amount, dueDate } =
    body as {
      workspaceId?: string;
      invoiceNumber?: string;
      customerName?: string;
      amount?: number;
      dueDate?: string;
    };

  const missing: string[] = [];
  if (!workspaceId) missing.push("workspaceId");
  if (!invoiceNumber) missing.push("invoiceNumber");
  if (!customerName) missing.push("customerName");
  if (amount === undefined || amount === null) missing.push("amount");
  if (!dueDate) missing.push("dueDate");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId! },
    });
    if (!workspace) return errorResponse("Workspace not found", 404);

    const invoice = await prisma.invoiceSnapshot.create({
      data: {
        organizationId: auth.ctx.organizationId,
        workspaceId: workspaceId!,
        invoiceNumber: invoiceNumber!,
        customerName: customerName!,
        customerEmail: (body.customerEmail as string) ?? undefined,
        amount: amount!,
        status: (body.status as InvoiceStatus) ?? InvoiceStatus.DRAFT,
        dueDate: new Date(dueDate!),
        items: body.notes ? { notes: body.notes } : undefined,
      },
    });

    return jsonResponse({ data: invoice }, 201);
  } catch (err) {
    return errorResponse("Failed to create invoice", 500, {
      message: (err as Error).message,
    });
  }
}
