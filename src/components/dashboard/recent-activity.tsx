"use client";

import { logEvents, agents } from "@/lib/mock-data";
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

export function RecentActivity() {
  const recent = [...logEvents]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {recent.map((event) => {
            const agent = event.agentId
              ? agentMap.get(event.agentId)
              : null;
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
                    {agent && (
                      <>
                        <span className="text-xs font-medium text-muted-foreground">
                          {agent.name}
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(event.timestamp)}
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
