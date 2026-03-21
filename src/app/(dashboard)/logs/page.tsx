"use client";

import { useState, useMemo } from "react";
import { Search, Filter, ScrollText } from "lucide-react";
import { logEvents, agents, workspaces } from "@/lib/mock-data";
import { LogLevel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const agentMap = new Map(agents.map((a) => [a.id, a]));
const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));

function getLogLevelStyle(level: LogLevel) {
  const styles: Record<string, string> = {
    DEBUG: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
    INFO: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    WARN: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    ERROR: "bg-red-500/15 text-red-400 border-red-500/20",
    CRITICAL: "bg-red-600/20 text-red-300 border-red-500/30 font-bold",
  };
  return styles[level] ?? styles.DEBUG;
}

function getLogLevelDotColor(level: LogLevel) {
  const colors: Record<string, string> = {
    DEBUG: "bg-zinc-500",
    INFO: "bg-blue-500",
    WARN: "bg-amber-500",
    ERROR: "bg-red-500",
    CRITICAL: "bg-red-400 animate-pulse",
  };
  return colors[level] ?? "bg-zinc-500";
}

function formatTimestamp(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const allSources = Array.from(
  new Set(logEvents.map((e) => (e.agentId ? "agent" : "system")))
);

const logLevels = Object.values(LogLevel);

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    let filtered = [...logEvents];

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((e) =>
        e.message.toLowerCase().includes(q)
      );
    }

    if (levelFilter !== "all") {
      filtered = filtered.filter((e) => e.level === levelFilter);
    }

    if (workspaceFilter !== "all") {
      filtered = filtered.filter((e) => e.workspaceId === workspaceFilter);
    }

    if (agentFilter !== "all") {
      filtered = filtered.filter((e) => e.agentId === agentFilter);
    }

    return filtered.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }, [search, levelFilter, workspaceFilter, agentFilter]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const level of logLevels) {
      counts[level] = logEvents.filter((e) => e.level === level).length;
    }
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Activity Logs
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {logEvents.length} events recorded
            </p>
          </div>
          <div className="flex items-center gap-2">
            {logLevels.map((level) => (
              <button
                key={level}
                onClick={() =>
                  setLevelFilter(levelFilter === level ? "all" : level)
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all",
                  levelFilter === level
                    ? getLogLevelStyle(level)
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    getLogLevelDotColor(level)
                  )}
                />
                {level}
                <span className="text-[10px] opacity-60">
                  {levelCounts[level]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search log messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
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
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Log entries */}
        <Card>
          <CardContent className="p-0">
            {/* Table header */}
            <div className="grid grid-cols-[140px_72px_100px_100px_1fr_100px] items-center gap-3 border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              <span>Timestamp</span>
              <span>Level</span>
              <span>Source</span>
              <span>Agent</span>
              <span>Message</span>
              <span>Workspace</span>
            </div>

            {/* Entries */}
            <div className="divide-y divide-border/50">
              {filteredLogs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
                  <ScrollText className="mb-3 h-8 w-8 opacity-40" />
                  No log entries match your filters
                </div>
              )}
              {filteredLogs.map((event) => {
                const agent = event.agentId
                  ? agentMap.get(event.agentId)
                  : null;
                const workspace = event.workspaceId
                  ? workspaceMap.get(event.workspaceId)
                  : null;
                const isCritical = event.level === LogLevel.CRITICAL;
                const isError = event.level === LogLevel.ERROR;

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "grid grid-cols-[140px_72px_100px_100px_1fr_100px] items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-muted/30",
                      isCritical && "bg-red-500/[0.04] hover:bg-red-500/[0.08]",
                      isError && "bg-red-500/[0.02] hover:bg-red-500/[0.05]"
                    )}
                  >
                    {/* Timestamp */}
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {formatTimestamp(event.timestamp)}
                    </span>

                    {/* Level */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "w-fit text-[10px]",
                        getLogLevelStyle(event.level)
                      )}
                    >
                      {event.level}
                    </Badge>

                    {/* Source */}
                    <span className="text-xs text-muted-foreground truncate">
                      {event.agentId ? "agent" : "system"}
                    </span>

                    {/* Agent */}
                    <span
                      className={cn(
                        "text-xs truncate",
                        agent ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {agent?.name ?? "—"}
                    </span>

                    {/* Message */}
                    <span
                      className={cn(
                        "truncate text-sm",
                        isCritical
                          ? "font-medium text-red-300"
                          : isError
                            ? "text-red-400/90"
                            : "text-foreground/80"
                      )}
                    >
                      {event.message}
                    </span>

                    {/* Workspace */}
                    <span className="text-xs text-muted-foreground truncate">
                      {workspace?.name ?? "Global"}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
