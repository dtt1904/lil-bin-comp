"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  LayoutList,
  Kanban,
  Plus,
  X,
  ExternalLink,
  Share2,
} from "lucide-react";
import {
  postDrafts,
  listings,
  agents,
  users,
  workspaces,
  shareTasks,
  publishedPosts,
} from "@/lib/mock-data";
import { PostDraftStatus, PostPlatform } from "@/lib/types";
import { formatRelativeTime, getAgentAvatarColor } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const agentMap = new Map(agents.map((a) => [a.id, a]));
const userMap = new Map(users.map((u) => [u.id, u]));
const listingMap = new Map(listings.map((l) => [l.id, l]));
const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));

const PLATFORM_COLOR: Record<string, string> = {
  FACEBOOK_PAGE: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  FACEBOOK_GROUP: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  INSTAGRAM: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  TIKTOK: "bg-zinc-700/50 text-zinc-200 border-zinc-600/30",
  OTHER: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const DRAFT_STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  REVIEW: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  APPROVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  SCHEDULED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  PUBLISHED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/20",
};

const SHARE_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  SHARED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/20",
  SKIPPED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const KANBAN_COLUMNS: PostDraftStatus[] = [
  PostDraftStatus.DRAFT,
  PostDraftStatus.REVIEW,
  PostDraftStatus.APPROVED,
  PostDraftStatus.SCHEDULED,
  PostDraftStatus.PUBLISHED,
];

const ALL_STATUSES = Object.values(PostDraftStatus);

export default function ContentPage() {
  const [view, setView] = useState<"board" | "table">("board");
  const [selectedStatuses, setSelectedStatuses] = useState<
    Set<PostDraftStatus>
  >(new Set());
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null
  );

  function toggleStatus(status: PostDraftStatus) {
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
    return postDrafts.filter((d) => {
      if (selectedStatuses.size > 0 && !selectedStatuses.has(d.status))
        return false;
      if (selectedWorkspace && d.workspaceId !== selectedWorkspace) return false;
      return true;
    });
  }, [selectedStatuses, selectedWorkspace]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Content Pipeline
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} draft{filtered.length !== 1 ? "s" : ""} across
              all workspaces
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-border/50 bg-muted/50 p-0.5">
              <button
                onClick={() => setView("board")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  view === "board"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Kanban className="size-4" />
                Board
              </button>
              <button
                onClick={() => setView("table")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  view === "table"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="size-4" />
                Table
              </button>
            </div>
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              Create Draft
            </Button>
          </div>
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
                    ? DRAFT_STATUS_COLOR[status]
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

        <Tabs defaultValue="drafts">
          <TabsList className="mb-6">
            <TabsTrigger value="drafts">Content Drafts</TabsTrigger>
            <TabsTrigger value="shares">Share Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="drafts">
            {view === "board" ? (
              <ContentKanban drafts={filtered} />
            ) : (
              <ContentTable drafts={filtered} />
            )}
          </TabsContent>

          <TabsContent value="shares">
            <ShareQueueTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ContentKanban({
  drafts,
}: {
  drafts: typeof postDrafts;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((status) => {
        const columnDrafts = drafts.filter((d) => d.status === status);
        return (
          <div
            key={status}
            className="flex w-72 shrink-0 flex-col rounded-lg border border-border/50 bg-muted/20"
          >
            <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5">
              <div
                className={cn(
                  "size-2 rounded-full",
                  status === PostDraftStatus.DRAFT && "bg-zinc-400",
                  status === PostDraftStatus.REVIEW && "bg-amber-400",
                  status === PostDraftStatus.APPROVED && "bg-emerald-400",
                  status === PostDraftStatus.SCHEDULED && "bg-blue-400",
                  status === PostDraftStatus.PUBLISHED && "bg-emerald-400"
                )}
              />
              <span className="text-sm font-medium">{status}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {columnDrafts.length}
              </span>
            </div>
            <div className="flex-1 space-y-2 p-2">
              {columnDrafts.map((draft) => (
                <DraftCard key={draft.id} draft={draft} />
              ))}
              {columnDrafts.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No drafts
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DraftCard({ draft }: { draft: (typeof postDrafts)[0] }) {
  const listing = draft.listingId ? listingMap.get(draft.listingId) : null;
  const agent = draft.createdByAgentId
    ? agentMap.get(draft.createdByAgentId)
    : null;

  return (
    <div className="rounded-md border border-border/50 bg-card p-3 transition-colors hover:border-border">
      <div className="flex items-center gap-1.5 mb-2">
        <Badge
          variant="outline"
          className={cn("text-[10px]", PLATFORM_COLOR[draft.platform] ?? "")}
        >
          {draft.platform.replace(/_/g, " ")}
        </Badge>
        <Badge
          variant="outline"
          className={cn("text-[10px]", DRAFT_STATUS_COLOR[draft.status] ?? "")}
        >
          {draft.status}
        </Badge>
      </div>
      <p className="text-sm text-foreground/90 line-clamp-3 leading-relaxed">
        {draft.caption.slice(0, 100)}
        {draft.caption.length > 100 && "..."}
      </p>
      {listing && (
        <Link
          href={`/modules/listings/${listing.id}`}
          className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:underline"
        >
          <ExternalLink className="size-3" />
          {listing.address}
        </Link>
      )}
      <div className="mt-2 flex items-center justify-between">
        {agent && (
          <div className="flex items-center gap-1.5">
            <Avatar className="size-5">
              <AvatarFallback
                className={cn(
                  getAgentAvatarColor(agent.name),
                  "text-white text-[9px] font-bold"
                )}
              >
                {agent.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{agent.name}</span>
          </div>
        )}
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeTime(draft.createdAt)}
        </span>
      </div>
    </div>
  );
}

function ContentTable({ drafts }: { drafts: typeof postDrafts }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Status</TableHead>
            <TableHead>Caption</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Listing</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Workspace</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drafts.map((draft) => {
            const listing = draft.listingId
              ? listingMap.get(draft.listingId)
              : null;
            const agent = draft.createdByAgentId
              ? agentMap.get(draft.createdByAgentId)
              : null;
            const workspace = workspaceMap.get(draft.workspaceId);

            return (
              <TableRow key={draft.id}>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={DRAFT_STATUS_COLOR[draft.status] ?? ""}
                  >
                    {draft.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="text-sm text-foreground/90 truncate">
                    {draft.caption.slice(0, 80)}
                    {draft.caption.length > 80 && "..."}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={PLATFORM_COLOR[draft.platform] ?? ""}
                  >
                    {draft.platform.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {listing ? (
                    <Link
                      href={`/modules/listings/${listing.id}`}
                      className="text-sm text-blue-400 hover:underline"
                    >
                      {listing.address}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
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
                  {workspace?.name ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatRelativeTime(draft.createdAt)}
                </TableCell>
              </TableRow>
            );
          })}
          {drafts.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No drafts match the current filters.
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ShareQueueTable() {
  const draftMap = new Map(postDrafts.map((d) => [d.id, d]));
  const pubPostMap = new Map(publishedPosts.map((p) => [p.postDraftId, p]));

  return (
    <div className="rounded-lg border border-border/50 bg-card">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <Share2 className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Share Queue</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {shareTasks.length} task{shareTasks.length !== 1 ? "s" : ""}
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Status</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Related Post</TableHead>
            <TableHead>Workspace</TableHead>
            <TableHead>Shared</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shareTasks.map((task) => {
            const draft = draftMap.get(task.postDraftId);
            const workspace = draft
              ? workspaceMap.get(draft.workspaceId)
              : null;

            return (
              <TableRow key={task.id}>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={SHARE_STATUS_COLOR[task.status] ?? ""}
                  >
                    {task.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={PLATFORM_COLOR[task.platform] ?? ""}
                  >
                    {task.platform.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs">
                  {draft ? (
                    <p className="text-sm text-foreground/90 truncate">
                      {draft.caption.slice(0, 60)}
                      {draft.caption.length > 60 && "..."}
                    </p>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {workspace?.name ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {task.sharedAt
                    ? formatRelativeTime(task.sharedAt)
                    : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatRelativeTime(task.createdAt)}
                </TableCell>
              </TableRow>
            );
          })}
          {shareTasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No share tasks in the queue.
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
