"use client";

import { formatRelativeTime, getSeverityColor } from "@/lib/helpers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

interface ApprovalRow {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  createdAt: string;
  requesterName: string | null;
  taskTitle: string | null;
  taskPriority: string | null;
}

interface PendingApprovalsProps {
  approvals: ApprovalRow[];
}

export function PendingApprovals({ approvals }: PendingApprovalsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          Pending Approvals
        </CardTitle>
        <CardDescription>{approvals.length} awaiting review</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {approvals.length === 0 ? (
          <p className="text-sm text-muted-foreground">All clear</p>
        ) : (
          approvals.map((approval) => (
            <div
              key={approval.id}
              className="rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-medium">
                  {approval.title}
                </p>
                <Badge
                  variant="outline"
                  className={getSeverityColor(approval.severity)}
                >
                  {approval.severity}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {approval.description}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>by {approval.requesterName ?? "Unknown"}</span>
                <span className="text-muted-foreground/50">·</span>
                <span>{formatRelativeTime(new Date(approval.createdAt))}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
