"use client";

import { formatRelativeTime } from "@/lib/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Info,
  AlertTriangle,
  AlertCircle,
  Flame,
  Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LOG_ICON_MAP: Record<
  string,
  { icon: typeof Info; color: string }
> = {
  INFO: { icon: Info, color: "text-blue-400" },
  WARN: { icon: AlertTriangle, color: "text-amber-400" },
  ERROR: { icon: AlertCircle, color: "text-red-400" },
  CRITICAL: { icon: Flame, color: "text-red-500" },
  DEBUG: { icon: Bug, color: "text-zinc-500" },
};

interface LogEventRow {
  id: string;
  level: string;
  message: string;
  createdAt: string;
  agentName: string | null;
}

interface RecentActivityProps {
  logEvents: LogEventRow[];
}

export function RecentActivity({ logEvents }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {logEvents.map((event) => {
            const { icon: Icon, color } =
              LOG_ICON_MAP[event.level] ?? LOG_ICON_MAP.INFO;

            return (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-foreground/90">
                    {event.message}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {event.agentName && (
                      <>
                        <span className="text-xs font-medium text-muted-foreground">
                          {event.agentName}
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(new Date(event.createdAt))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
