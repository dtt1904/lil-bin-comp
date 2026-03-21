"use client";

import { useState, useMemo } from "react";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  formatRelativeTime,
  getAgentAvatarColor,
  getSeverityColor,
} from "@/lib/helpers";
import { cn } from "@/lib/utils";

interface SerializedApproval {
  id: string;
  title: string;
  description: string | null;
  status: string;
  severity: string;
  taskId: string | null;
  requestedById: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: unknown;
  requestedBy: { id: string; name: string; slug: string } | null;
  reviewedBy: { id: string; name: string } | null;
  task: { id: string; title: string; status: string; priority: string; workspaceId: string | null } | null;
}

interface ApprovalsClientProps {
  approvals: SerializedApproval[];
  workspaces: { id: string; name: string }[];
}

function getApprovalStatusStyle(status: string) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    APPROVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    DENIED: "bg-red-500/15 text-red-400 border-red-500/20",
    EXPIRED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  };
  return styles[status] ?? styles.EXPIRED;
}

function getSeverityBorderColor(severity: string) {
  const map: Record<string, string> = {
    CRITICAL: "border-l-red-500",
    HIGH: "border-l-orange-500",
    MEDIUM: "border-l-blue-500",
    LOW: "border-l-zinc-500",
  };
  return map[severity] ?? "border-l-zinc-500";
}

export function ApprovalsPageClient({ approvals, workspaces }: ApprovalsClientProps) {
  const [activeTab, setActiveTab] = useState("pending");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const pendingCount = approvals.filter((a) => a.status === "PENDING").length;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const approvedToday = approvals.filter(
    (a) =>
      a.status === "APPROVED" &&
      a.reviewedAt &&
      new Date(a.reviewedAt) >= todayStart
  ).length;

  const deniedToday = approvals.filter(
    (a) =>
      a.status === "DENIED" &&
      a.reviewedAt &&
      new Date(a.reviewedAt) >= todayStart
  ).length;

  const filteredApprovals = useMemo(() => {
    let filtered = [...approvals];

    if (activeTab !== "all") {
      filtered = filtered.filter(
        (a) => a.status === activeTab.toUpperCase()
      );
    }

    if (workspaceFilter !== "all") {
      filtered = filtered.filter((a) => a.task?.workspaceId === workspaceFilter);
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter((a) => a.severity === severityFilter);
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [approvals, activeTab, workspaceFilter, severityFilter]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and manage approval requests from agents
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {pendingCount}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {approvedToday}
                </p>
                <p className="text-xs text-muted-foreground">Approved Today</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {deniedToday}
                </p>
                <p className="text-xs text-muted-foreground">Denied Today</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">~2.4h</p>
                <p className="text-xs text-muted-foreground">Avg Response</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>
          <select
            value={workspaceFilter}
            onChange={(e) => setWorkspaceFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="all">All Workspaces</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" onValueChange={setActiveTab}>
          <TabsList variant="line" className="mb-6">
            <TabsTrigger value="pending">
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="denied">Denied</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          {["pending", "approved", "denied", "all"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="space-y-3">
                {filteredApprovals.length === 0 && (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    No approvals found
                  </div>
                )}
                {filteredApprovals.map((approval) => {
                  const requester = approval.requestedBy;
                  const reviewer = approval.reviewedBy;
                  const isPending = approval.status === "PENDING";

                  return (
                    <Card
                      key={approval.id}
                      className={cn(
                        "border-l-[3px] transition-all",
                        getSeverityBorderColor(approval.severity),
                        isPending && "ring-1 ring-amber-500/10 bg-amber-500/[0.02]"
                      )}
                    >
                      <CardContent>
                        <div className="flex items-start gap-4">
                          {/* Requester avatar */}
                          <Avatar>
                            <AvatarFallback
                              className={cn(
                                requester
                                  ? getAgentAvatarColor(requester.name)
                                  : "bg-zinc-600",
                                "text-sm font-bold text-white"
                              )}
                            >
                              {requester
                                ? requester.name[0].toUpperCase()
                                : "?"}
                            </AvatarFallback>
                          </Avatar>

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold tracking-tight">
                                    {approval.title}
                                  </h3>
                                  <Badge
                                    variant="outline"
                                    className={getApprovalStatusStyle(approval.status)}
                                  >
                                    {approval.status}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={getSeverityColor(approval.severity)}
                                  >
                                    {approval.severity}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                  {approval.description}
                                </p>
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatRelativeTime(new Date(approval.createdAt))}
                              </span>
                            </div>

                            {/* Meta info */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>
                                Requested by{" "}
                                <span className="text-foreground">
                                  {requester?.name ?? "Unknown"}
                                </span>
                              </span>
                              {reviewer && (
                                <span>
                                  Reviewer:{" "}
                                  <span className="text-foreground">
                                    {reviewer.name}
                                  </span>
                                </span>
                              )}
                              {approval.task && (
                                <span>
                                  Task: {approval.task.title}
                                </span>
                              )}
                            </div>

                            {/* Actions for pending */}
                            {isPending && (
                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  className="h-7 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 gap-1.5"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Deny
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1.5 text-muted-foreground"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Comment
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
