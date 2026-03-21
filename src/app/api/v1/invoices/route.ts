import { NextRequest } from "next/server";
import { store, generateId } from "@/lib/store";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { InvoiceStatus } from "@/lib/types";

const VALID_STATUSES = Object.values(InvoiceStatus);

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const params = parseSearchParams(req);
  const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
  const offset = parseInt(params.offset || "0", 10) || 0;

  let results = store.invoiceSnapshots;

  if (params.workspaceId) {
    results = store.filter(results, (i) => i.workspaceId === params.workspaceId);
  }
  if (params.status) {
    if (!VALID_STATUSES.includes(params.status as InvoiceStatus)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }
    results = store.filter(results, (i) => i.status === params.status);
  }
  if (params.clientName) {
    const q = params.clientName.toLowerCase();
    results = store.filter(results, (i) =>
      i.clientName.toLowerCase().includes(q)
    );
  }
  if (params.overdue === "true") {
    const now = new Date();
    results = store.filter(results, (i) =>
      i.status === InvoiceStatus.OVERDUE ||
      (i.status === InvoiceStatus.SENT && new Date(i.dueDate) < now)
    );
  }

  const total = results.length;
  const data = results.slice(offset, offset + limit);

  return jsonResponse({ data, meta: { total, limit, offset } });
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

  const { workspaceId, invoiceNumber, clientName, amount, dueDate } = body as {
    workspaceId?: string;
    invoiceNumber?: string;
    clientName?: string;
    amount?: number;
    dueDate?: string;
  };

  const missing: string[] = [];
  if (!workspaceId) missing.push("workspaceId");
  if (!invoiceNumber) missing.push("invoiceNumber");
  if (!clientName) missing.push("clientName");
  if (amount === undefined || amount === null) missing.push("amount");
  if (!dueDate) missing.push("dueDate");
  if (missing.length > 0) {
    return errorResponse("Missing required fields", 400, { missing });
  }

  const workspace = store.findById(store.workspaces, workspaceId!);
  if (!workspace) return errorResponse("Workspace not found", 404);

  const now = new Date();
  const invoice = store.insert(store.invoiceSnapshots, {
    id: generateId("inv"),
    workspaceId: workspaceId!,
    invoiceNumber: invoiceNumber!,
    clientName: clientName!,
    amount: amount!,
    status: (body.status as InvoiceStatus) ?? InvoiceStatus.DRAFT,
    issuedAt: body.issuedAt ? new Date(body.issuedAt as string) : now,
    dueDate: new Date(dueDate!),
    paidAt: undefined,
    stripePaymentId: (body.stripePaymentId as string) ?? undefined,
    notes: (body.notes as string) ?? undefined,
    createdAt: now,
    updatedAt: now,
  });

  return jsonResponse({ data: invoice }, 201);
}
