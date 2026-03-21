"use client";

import {
  getAgentStatusColor,
  getAgentStatusDotColor,
  getAgentAvatarColor,
} from "@/lib/helpers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AgentRow {
  id: string;
  name: string;
  status: string;
  currentTaskTitle: string | null;
}

interface AgentStatusPanelProps {
  agents: AgentRow[];
}

export function AgentStatusPanel({ agents }: AgentStatusPanelProps) {
  const onlineCount = agents.filter(
    (a) => a.status === "ONLINE" || a.status === "BUSY"
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Status</CardTitle>
        <CardDescription>
          {onlineCount}/{agents.length} online
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
          >
            <Avatar size="sm">
              <AvatarFallback
                className={cn(
                  getAgentAvatarColor(agent.name),
                  "text-white font-bold"
                )}
              >
                {agent.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{agent.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {agent.currentTaskTitle ?? "Idle"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  getAgentStatusDotColor(agent.status)
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-medium",
                  getAgentStatusColor(agent.status)
                )}
              >
                {agent.status}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
