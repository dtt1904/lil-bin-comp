"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  LayoutList,
  Kanban,
  X,
  ExternalLink,
  Share2,
} from "lucide-react";
import { formatRelativeTime, getAgentAvatarColor } from "@/lib/helpers";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CreateDraftModal } from "@/components/forms/create-draft-modal";

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

const KANBAN_COLUMNS = ["DRAFT", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"];

const ALL_STATUSES = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "FAILED",
];

interface SerializedPostDraft {
  id: string;
  title: string;
  content: string;
  platform: string;
  status: string;
  listingId: string | null;
  createdByAgentId: string | null;
  workspaceId: string;
  createdAt: string;
  listing: { address: string } | null;
  createdByAgent: { name: string } | null;
  workspace: { name: string } | null;
}

interface SerializedShareTask {
  id: string;
  postDraftId: string | null;
  targetGroup: string;
  platform: string;
  status: string;
  sharedAt: string | null;
  workspaceId: string;
  createdAt: string;
  postDraft: {
    content: string;
    workspace: { name: string } | null;
  } | null;
}

interface SerializedWorkspace {
  id: string;
  name: string;
}

interface SerializedListingOption {
  id: string;
  address: string;
}

interface ContentPageClientProps {
  drafts: SerializedPostDraft[];
  shareTasks: SerializedShareTask[];
  workspaces: SerializedWorkspace[];
  listings: SerializedListingOption[];
}

export function ContentPageClient({
  drafts,
  shareTasks,
  workspaces,
  listings,
}: ContentPageClientProps) {
  const [view, setView] = useState<"board" | "table">("board");
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
    return drafts.filter((d) => {
      if (selectedStatuses.size > 0 && !selectedStatuses.has(d.status))
        return false;
      if (selectedWorkspace && d.workspaceId !== selectedWorkspace) return false;
      return true;
    });
  }, [drafts, selectedStatuses, selectedWorkspace]);

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
            <CreateDraftModal workspaces={workspaces} listings={listings} />
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
            <ShareQueueTable shareTasks={shareTasks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ContentKanban({ drafts }: { drafts: SerializedPostDraft[] }) {
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
                  status === "DRAFT" && "bg-zinc-400",
                  status === "REVIEW" && "bg-amber-400",
                  status === "APPROVED" && "bg-emerald-400",
                  status === "SCHEDULED" && "bg-blue-400",
                  status === "PUBLISHED" && "bg-emerald-400"
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

function DraftCard({ draft }: { draft: SerializedPostDraft }) {
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
        {draft.content.slice(0, 100)}
        {draft.content.length > 100 && "..."}
      </p>
      {draft.listing && (
        <Link
          href={`/modules/listings/${draft.listingId}`}
          className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:underline"
        >
          <ExternalLink className="size-3" />
          {draft.listing.address}
        </Link>
      )}
      <div className="mt-2 flex items-center justify-between">
        {draft.createdByAgent && (
          <div className="flex items-center gap-1.5">
            <Avatar className="size-5">
              <AvatarFallback
                className={cn(
                  getAgentAvatarColor(draft.createdByAgent.name),
                  "text-white text-[9px] font-bold"
                )}
              >
                {draft.createdByAgent.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {draft.createdByAgent.name}
            </span>
          </div>
        )}
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeTime(new Date(draft.createdAt))}
        </span>
      </div>
    </div>
  );
}

function ContentTable({ drafts }: { drafts: SerializedPostDraft[] }) {
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
          {drafts.map((draft) => (
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
                  {draft.content.slice(0, 80)}
                  {draft.content.length > 80 && "..."}
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
                {draft.listing ? (
                  <Link
                    href={`/modules/listings/${draft.listingId}`}
                    className="text-sm text-blue-400 hover:underline"
                  >
                    {draft.listing.address}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {draft.createdByAgent ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback
                        className={cn(
                          getAgentAvatarColor(draft.createdByAgent.name),
                          "text-white text-[10px] font-bold"
                        )}
                      >
                        {draft.createdByAgent.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {draft.createdByAgent.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {draft.workspace?.name ?? "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatRelativeTime(new Date(draft.createdAt))}
              </TableCell>
            </TableRow>
          ))}
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

function ShareQueueTable({
  shareTasks,
}: {
  shareTasks: SerializedShareTask[];
}) {
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
            <TableHead>Target Group</TableHead>
            <TableHead>Related Post</TableHead>
            <TableHead>Workspace</TableHead>
            <TableHead>Shared</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shareTasks.map((task) => (
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
                  className={PLATFORM_COLOR[task.platform.toUpperCase()] ?? ""}
                >
                  {task.platform.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {task.targetGroup}
              </TableCell>
              <TableCell className="max-w-xs">
                {task.postDraft ? (
                  <p className="text-sm text-foreground/90 truncate">
                    {task.postDraft.content.slice(0, 60)}
                    {task.postDraft.content.length > 60 && "..."}
                  </p>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {task.postDraft?.workspace?.name ?? "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {task.sharedAt
                  ? formatRelativeTime(new Date(task.sharedAt))
                  : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatRelativeTime(new Date(task.createdAt))}
              </TableCell>
            </TableRow>
          ))}
          {shareTasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center">
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
