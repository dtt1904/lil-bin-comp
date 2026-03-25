"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  FileText,
  X,
  CreditCard,
} from "lucide-react";
import {
  formatCurrency,
  formatRelativeTime,
  getRenderNowMs,
} from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { streamUrl } from "@/lib/live-stream";

const INVOICE_STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  SENT: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  PAID: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  OVERDUE: "bg-red-500/15 text-red-400 border-red-500/20",
  CANCELLED: "bg-zinc-500/15 text-zinc-500 border-zinc-500/20 line-through",
};

const ALL_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"];

interface SerializedInvoice {
  id: string;
  customerName: string;
  customerEmail: string | null;
  invoiceNumber: string | null;
  amount: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  items: unknown;
  source: string;
  workspaceId: string;
  createdAt: string;
  workspace: { id: string; name: string } | null;
}

interface SerializedWorkspace {
  id: string;
  name: string;
}

interface InvoicesPageClientProps {
  invoices: SerializedInvoice[];
  workspaces: SerializedWorkspace[];
}

export function InvoicesPageClient({
  invoices,
  workspaces,
}: InvoicesPageClientProps) {
  const router = useRouter();
  const [liveInvoices, setLiveInvoices] = useState<SerializedInvoice[]>(invoices);
  const [liveConnected, setLiveConnected] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set()
  );
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null
  );
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  useEffect(() => {
    setLiveInvoices(invoices);
  }, [invoices]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      const id = setInterval(async () => {
        const res = await api<SerializedInvoice[]>("/invoices?limit=120");
        if (res.ok && res.data) {
          setLiveConnected(false);
          setLiveInvoices(res.data);
        }
      }, 6000);
      return () => clearInterval(id);
    }

    const es = new EventSource(streamUrl("/invoices"));
    es.addEventListener("connected", () => setLiveConnected(true));
    es.addEventListener("invoices", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        if (payload?.data?.invoices) {
          setLiveInvoices(payload.data.invoices as SerializedInvoice[]);
        }
      } catch {
        // ignore malformed frames
      }
    });
    es.onerror = () => setLiveConnected(false);
    return () => es.close();
  }, []);

  async function markPaid(invoiceId: string) {
    setMarkingPaidId(invoiceId);
    const result = await api(`/invoices/${invoiceId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "PAID",
        paidAt: new Date().toISOString(),
      }),
    });
    setMarkingPaidId(null);
    if (!result.ok) {
      alert(result.error || "Failed to mark invoice as paid");
      return;
    }
    router.refresh();
  }

  function toggleStatus(status: string) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function clearFilters() {
    setSelectedStatuses(new Set());
    setSelectedWorkspace(null);
  }

  const hasFilters = selectedStatuses.size > 0 || selectedWorkspace;

  const filtered = useMemo(() => {
    return liveInvoices.filter((inv) => {
      if (selectedStatuses.size > 0 && !selectedStatuses.has(inv.status))
        return false;
      if (selectedWorkspace && inv.workspaceId !== selectedWorkspace)
        return false;
      return true;
    });
  }, [liveInvoices, selectedStatuses, selectedWorkspace]);

  const overdueInvoices = liveInvoices.filter(
    (inv) => inv.status === "OVERDUE"
  );

  const totalOutstanding = liveInvoices
    .filter(
      (inv) => inv.status === "SENT" || inv.status === "OVERDUE"
    )
    .reduce((sum, inv) => sum + inv.amount, 0);

  const overdueAmount = overdueInvoices.reduce(
    (sum, inv) => sum + inv.amount,
    0
  );

  const now = new Date(getRenderNowMs());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidThisMonth = liveInvoices
    .filter(
      (inv) =>
        inv.status === "PAID" &&
        inv.paidAt &&
        new Date(inv.paidAt) >= monthStart
    )
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalInvoices = liveInvoices.length;

  function getItemsSummary(items: unknown): string | null {
    if (!items) return null;
    if (typeof items === "string") return items;
    if (Array.isArray(items)) {
      return items
        .slice(0, 2)
        .map((item: Record<string, unknown>) =>
          typeof item === "string" ? item : item?.description ?? item?.name ?? ""
        )
        .filter(Boolean)
        .join(", ");
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-3 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Invoice tracking and overdue management
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Live:{" "}
            <span className={liveConnected ? "text-emerald-400" : "text-amber-400"}>
              {liveConnected ? "connected" : "reconnecting"}
            </span>
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          <InvoiceStatCard
            icon={DollarSign}
            label="Total Outstanding"
            value={formatCurrency(totalOutstanding)}
            iconClassName="text-blue-400"
            iconBgClassName="bg-blue-500/10"
          />
          <InvoiceStatCard
            icon={AlertTriangle}
            label="Overdue Amount"
            value={formatCurrency(overdueAmount)}
            iconClassName="text-red-400"
            iconBgClassName="bg-red-500/10"
            valueClassName="text-red-400"
          />
          <InvoiceStatCard
            icon={CheckCircle2}
            label="Paid This Month"
            value={formatCurrency(paidThisMonth)}
            iconClassName="text-emerald-400"
            iconBgClassName="bg-emerald-500/10"
          />
          <InvoiceStatCard
            icon={FileText}
            label="Total Invoices"
            value={totalInvoices.toString()}
            iconClassName="text-violet-400"
            iconBgClassName="bg-violet-500/10"
          />
        </div>

        {/* Filter Bar */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Status
            </span>
            {ALL_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-all",
                  selectedStatuses.has(status)
                    ? INVOICE_STATUS_COLOR[status]
                    : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Workspace
              </span>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() =>
                    setSelectedWorkspace(
                      selectedWorkspace === ws.id ? null : ws.id
                    )
                  }
                  className={cn(
                    "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-all",
                    selectedWorkspace === ws.id
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                      : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  {ws.name}
                </button>
              ))}
            </div>
            {hasFilters && (
              <>
                <div className="h-5 w-px bg-border/50" />
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                  Clear filters
                </button>
              </>
            )}
          </div>
        </div>

        {/* All Invoices Table */}
        <div className="mb-8 rounded-lg border border-border/50 bg-card overflow-x-auto">
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
            <FileText className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">All Invoices</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Status</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => {
                const isOverdue = inv.status === "OVERDUE";
                const isDueSoon =
                  inv.status === "SENT" &&
                  inv.dueDate &&
                  new Date(inv.dueDate).getTime() - now.getTime() <
                    3 * 24 * 60 * 60 * 1000;
                const itemsSummary = getItemsSummary(inv.items);

                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={INVOICE_STATUS_COLOR[inv.status] ?? ""}
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {inv.customerName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {inv.workspace?.name ?? "Internal"}
                        </p>
                        {itemsSummary && (
                          <p className="text-xs text-muted-foreground truncate max-w-48">
                            {itemsSummary}
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {inv.invoiceNumber ?? "—"}
                    </TableCell>
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isOverdue && "text-red-400"
                        )}
                      >
                        {formatCurrency(inv.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {inv.dueDate ? (
                        <span
                          className={cn(
                            "text-sm",
                            isOverdue && "text-red-400 font-medium",
                            isDueSoon && "text-amber-400"
                          )}
                        >
                          {new Date(inv.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {isOverdue && (
                            <span className="ml-1 text-xs">(overdue)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.paidAt
                        ? new Date(inv.paidAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.workspace?.name ?? "Internal"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {inv.status !== "PAID" &&
                          inv.status !== "CANCELLED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              disabled={markingPaidId === inv.id}
                              onClick={() => markPaid(inv.id)}
                            >
                              <CreditCard className="size-3" />
                              Mark Paid
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      No invoices match the current filters.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Overdue Summary */}
        {overdueInvoices.length > 0 && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 overflow-x-auto">
            <div className="flex items-center gap-2 border-b border-red-500/20 px-4 py-3">
              <AlertTriangle className="size-4 text-red-400" />
              <h3 className="text-sm font-medium text-red-400">
                Overdue Summary
              </h3>
              <span className="ml-auto text-sm font-semibold text-red-400">
                {formatCurrency(overdueAmount)} total overdue
              </span>
            </div>
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-red-500/10">
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInvoices.map((inv) => {
                  const daysOverdue = inv.dueDate
                    ? Math.floor(
                        (now.getTime() - new Date(inv.dueDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0;

                  return (
                    <TableRow key={inv.id} className="border-red-500/10">
                      <TableCell>
                        <p className="text-sm font-medium">
                          {inv.customerName}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-red-300">
                        {inv.invoiceNumber ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-red-400">
                        {formatCurrency(inv.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-red-400">
                        {inv.dueDate
                          ? new Date(inv.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-red-500/15 text-red-400 border-red-500/20"
                        >
                          {daysOverdue} days
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inv.workspace?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            disabled={markingPaidId === inv.id}
                            onClick={() => markPaid(inv.id)}
                          >
                            <CreditCard className="size-3" />
                            Mark Paid
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function InvoiceStatCard({
  icon: Icon,
  label,
  value,
  iconClassName,
  iconBgClassName,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  iconClassName?: string;
  iconBgClassName?: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2 p-3 sm:gap-4 sm:p-6">
        <div
          className={cn(
            "flex size-8 sm:size-10 items-center justify-center rounded-lg",
            iconBgClassName
          )}
        >
          <Icon className={cn("size-4 sm:size-5", iconClassName)} />
        </div>
        <div>
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              "text-base sm:text-xl font-semibold tracking-tight",
              valueClassName
            )}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
