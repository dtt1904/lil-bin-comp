"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, X, Building2 } from "lucide-react";
import {
  formatCurrency,
  formatRelativeTime,
  getAgentAvatarColor,
} from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const LISTING_STATUS_COLOR: Record<string, string> = {
  NEW: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  INTAKE: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  MEDIA_READY: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  CONTENT_DRAFTING: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  REVIEW: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  PUBLISHED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  ARCHIVED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const ALL_STATUSES = [
  "NEW",
  "INTAKE",
  "MEDIA_READY",
  "CONTENT_DRAFTING",
  "REVIEW",
  "PUBLISHED",
  "ARCHIVED",
];

interface SerializedListing {
  id: string;
  mlsNumber: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number | null;
  status: string;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  createdAt: string;
  workspaceId: string;
  assignedAgent: { id: string; name: string } | null;
  workspace: { id: string; name: string } | null;
}

interface SerializedWorkspace {
  id: string;
  name: string;
}

interface ListingsPageClientProps {
  listings: SerializedListing[];
  workspaces: SerializedWorkspace[];
}

export function ListingsPageClient({
  listings,
  workspaces,
}: ListingsPageClientProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set()
  );
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null
  );

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
    return listings.filter((l) => {
      if (selectedStatuses.size > 0 && !selectedStatuses.has(l.status))
        return false;
      if (selectedWorkspace && l.workspaceId !== selectedWorkspace) return false;
      return true;
    });
  }, [listings, selectedStatuses, selectedWorkspace]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} listing{filtered.length !== 1 ? "s" : ""} across
              all workspaces
            </p>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Add Listing
          </Button>
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
                    ? LISTING_STATUS_COLOR[status]
                    : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {status.replace(/_/g, " ")}
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

        {/* Table */}
        <div className="rounded-lg border border-border/50 bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Status</TableHead>
                <TableHead>MLS #</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Beds/Baths/Sqft</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((listing) => {
                const agent = listing.assignedAgent;

                return (
                  <TableRow key={listing.id} className="group">
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          LISTING_STATUS_COLOR[listing.status] ?? ""
                        }
                      >
                        {listing.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {listing.mlsNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/modules/listings/${listing.id}`}
                        className="group-hover:text-blue-400 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium">
                              {listing.address}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {listing.city}, {listing.state} {listing.zipCode}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {listing.price ? formatCurrency(listing.price) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {listing.propertyType ?? "Residential"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {listing.bedrooms ?? "—"} bd / {listing.bathrooms ?? "—"}{" "}
                      ba / {listing.sqft?.toLocaleString() ?? "—"} sqft
                    </TableCell>
                    <TableCell>
                      {agent ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6">
                            <AvatarFallback
                              className={cn(
                                getAgentAvatarColor(agent.name),
                                "text-white text-[10px] font-bold"
                              )}
                            >
                              {agent.name[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">
                            {agent.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {listing.workspace?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(new Date(listing.createdAt))}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      No listings match the current filters.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
