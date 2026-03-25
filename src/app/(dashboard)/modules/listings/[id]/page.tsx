export const dynamic = "force-dynamic";
import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Sparkles,
  Upload,
  Send,
  Building2,
  Image as ImageIcon,
  Video,
  Camera,
} from "lucide-react";
import { prisma } from "@/lib/db";
import {
  formatCurrency,
  formatRelativeTime,
  getAgentAvatarColor,
} from "@/lib/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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

const MEDIA_TYPE_COLOR: Record<string, string> = {
  DRONE: "bg-sky-600/80",
  FRONT_EXTERIOR: "bg-emerald-600/80",
  INTERIOR: "bg-amber-600/80",
  BACK_EXTERIOR: "bg-teal-600/80",
  VIDEO: "bg-purple-600/80",
  FLOOR_PLAN: "bg-indigo-600/80",
  OTHER: "bg-zinc-600/80",
};

const MEDIA_TYPE_ICON: Record<string, typeof Camera> = {
  DRONE: Camera,
  FRONT_EXTERIOR: Building2,
  INTERIOR: ImageIcon,
  BACK_EXTERIOR: Building2,
  VIDEO: Video,
  FLOOR_PLAN: ImageIcon,
  OTHER: ImageIcon,
};

type ListingDetail = Prisma.ListingGetPayload<{
  include: {
    mediaAssets: { orderBy: { sortOrder: "asc" } };
    postDrafts: {
      include: {
        publishedPosts: true;
        createdByAgent: { select: { id: true; name: true } };
      };
      orderBy: { createdAt: "desc" };
    };
    assignedAgent: true;
    workspace: true;
  };
}>;

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let listing: ListingDetail | null = null;
  try {
    listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        mediaAssets: { orderBy: { sortOrder: "asc" } },
        postDrafts: {
          include: {
            publishedPosts: true,
            createdByAgent: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        assignedAgent: true,
        workspace: true,
      },
    });
  } catch (err) {
    console.error("[listing-detail] query failed:", err);
    try {
      const lighter = await prisma.listing.findUnique({
        where: { id },
        select: {
          id: true,
          mlsNumber: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          price: true,
          status: true,
          propertyType: true,
          bedrooms: true,
          bathrooms: true,
          sqft: true,
          description: true,
          organizationId: true,
          workspaceId: true,
          assignedAgentId: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          assignedAgent: true,
          workspace: true,
        },
      });
      if (lighter) {
        listing = {
          ...lighter,
          mediaAssets: [],
          postDrafts: [],
        } as ListingDetail;
      }
    } catch {
      notFound();
    }
  }

  if (!listing) {
    notFound();
  }

  const agent = listing.assignedAgent;
  const workspace = listing.workspace;
  const listingMedia = listing.mediaAssets;

  const mediaByType = listingMedia.reduce(
    (acc, m) => {
      if (!acc[m.type]) acc[m.type] = [];
      acc[m.type].push(m);
      return acc;
    },
    {} as Record<string, typeof listingMedia>
  );

  const publishedDraftIds = new Set(
    listing.postDrafts
      .flatMap((d) => d.publishedPosts)
      .map((p) => p.postDraftId)
  );

  const unpublishedDrafts = listing.postDrafts.filter(
    (d) => !publishedDraftIds.has(d.id)
  );

  const allPublishedPosts = listing.postDrafts.flatMap((d) =>
    d.publishedPosts.map((p) => ({
      ...p,
      draft: d,
    }))
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/modules/listings" className="hover:text-foreground">
            Listings
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{listing.address}</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {listing.address}
              </h1>
              <Badge
                variant="outline"
                className={LISTING_STATUS_COLOR[listing.status] ?? ""}
              >
                {listing.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {listing.mlsNumber && (
                <span className="font-mono">{listing.mlsNumber}</span>
              )}
              {listing.price && (
                <>
                  <span>&middot;</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(listing.price)}
                  </span>
                </>
              )}
              <span>&middot;</span>
              <span>
                {listing.city}, {listing.state} {listing.zipCode}
              </span>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Address
                    </p>
                    <p className="mt-1 text-sm">{listing.address}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      City
                    </p>
                    <p className="mt-1 text-sm">{listing.city}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      State / Zip
                    </p>
                    <p className="mt-1 text-sm">
                      {listing.state} {listing.zipCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Price
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {listing.price ? formatCurrency(listing.price) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Bedrooms
                    </p>
                    <p className="mt-1 text-sm">{listing.bedrooms ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Bathrooms
                    </p>
                    <p className="mt-1 text-sm">{listing.bathrooms ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Sq Ft
                    </p>
                    <p className="mt-1 text-sm">
                      {listing.sqft?.toLocaleString() ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Type
                    </p>
                    <p className="mt-1 text-sm">
                      {listing.propertyType ?? "Residential"}
                    </p>
                  </div>
                </div>
                {listing.description && (
                  <div className="mt-4 rounded-md border border-border/50 bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {listing.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Media Assets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Media Assets ({listingMedia.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(mediaByType).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No media assets uploaded yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(mediaByType).map(([type, assets]) => {
                      const Icon = MEDIA_TYPE_ICON[type] ?? ImageIcon;
                      return (
                        <div key={type}>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            {type.replace(/_/g, " ")} ({assets.length})
                          </p>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                            {assets.map((asset) => (
                              <div
                                key={asset.id}
                                className={cn(
                                  "relative flex flex-col items-center justify-center rounded-lg border border-border/50 p-4 h-28",
                                  MEDIA_TYPE_COLOR[type] ?? "bg-zinc-600/80"
                                )}
                              >
                                <Icon className="size-6 text-white/80 mb-1" />
                                <span className="text-[10px] font-medium text-white/90 uppercase tracking-wider">
                                  {type.replace(/_/g, " ")}
                                </span>
                                <span className="mt-1 text-[10px] text-white/60 truncate max-w-full px-1">
                                  {asset.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Content Drafts */}
            {unpublishedDrafts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Content Drafts ({unpublishedDrafts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {unpublishedDrafts.map((draft) => {
                    const draftAgent = draft.createdByAgent;
                    return (
                      <div
                        key={draft.id}
                        className="rounded-md border border-border/50 bg-muted/30 p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={PLATFORM_COLOR[draft.platform] ?? ""}
                          >
                            {draft.platform.replace(/_/g, " ")}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              DRAFT_STATUS_COLOR[draft.status] ?? ""
                            }
                          >
                            {draft.status}
                          </Badge>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {formatRelativeTime(draft.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90 line-clamp-2">
                          {draft.content}
                        </p>
                        {draftAgent && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Created by {draftAgent.name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Published Posts */}
            {allPublishedPosts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Published Posts ({allPublishedPosts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allPublishedPosts.map((post) => {
                    const metrics = post.metrics as Record<
                      string,
                      number
                    > | null;
                    return (
                      <div
                        key={post.id}
                        className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={PLATFORM_COLOR[post.platform] ?? ""}
                          >
                            {post.platform.replace(/_/g, " ")}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                          >
                            PUBLISHED
                          </Badge>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {formatRelativeTime(post.publishedAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90 line-clamp-2">
                          {post.draft.content}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          {metrics?.impressions !== undefined && (
                            <span>
                              {Number(
                                metrics.impressions
                              ).toLocaleString()}{" "}
                              impressions
                            </span>
                          )}
                          {metrics?.engagements !== undefined && (
                            <span>
                              {Number(
                                metrics.engagements
                              ).toLocaleString()}{" "}
                              engagements
                            </span>
                          )}
                          {post.url && (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              View post
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Status Card */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Status
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-1",
                      LISTING_STATUS_COLOR[listing.status] ?? ""
                    )}
                  >
                    {listing.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <Separator />

                {/* Assigned Agent */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Assigned Agent
                  </p>
                  {agent ? (
                    <Link
                      href={`/agents/${agent.id}`}
                      className="mt-1 flex items-center gap-2 hover:opacity-80"
                    >
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
                      <div>
                        <p className="text-sm font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.model}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Unassigned
                    </p>
                  )}
                </div>

                <Separator />

                {/* Workspace */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Workspace
                  </p>
                  <p className="mt-1 text-sm">{workspace?.name ?? "—"}</p>
                </div>

                <Separator />

                {/* MLS Number */}
                {listing.mlsNumber && (
                  <>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        MLS #
                      </p>
                      <p className="mt-1 text-sm font-mono">
                        {listing.mlsNumber}
                      </p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Dates */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span>{formatRelativeTime(listing.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Updated</span>
                    <span>{formatRelativeTime(listing.updatedAt)}</span>
                  </div>
                </div>

                <Separator />

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Quick Actions
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    <Sparkles className="size-4 text-amber-400" />
                    Generate Content
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    <Upload className="size-4 text-blue-400" />
                    Upload Media
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    <Send className="size-4 text-emerald-400" />
                    Publish
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
