"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { agents, workspaces } from "@/lib/mock-data";
import { AgentStatus } from "@/lib/types";
import { AgentCard } from "@/components/agents/agent-card";

const STATUS_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Online", value: AgentStatus.ONLINE },
  { label: "Busy", value: AgentStatus.BUSY },
  { label: "Idle", value: AgentStatus.IDLE },
  { label: "Offline", value: AgentStatus.OFFLINE },
  { label: "Error", value: AgentStatus.ERROR },
  { label: "Paused", value: AgentStatus.PAUSED },
];

export default function AgentsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesStatus =
        statusFilter === "ALL" || agent.status === statusFilter;
      const matchesWorkspace =
        workspaceFilter === "all" || agent.workspaceId === workspaceFilter;
      return matchesStatus && matchesWorkspace;
    });
  }, [statusFilter, workspaceFilter]);

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Agent Directory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {agents.length} agents across {workspaces.length} workspaces
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Workspace Filter */}
        <Select
          value={workspaceFilter}
          onValueChange={(val) => setWorkspaceFilter(val ?? "all")}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workspaces</SelectItem>
            {workspaces.map((ws) => (
              <SelectItem key={ws.id} value={ws.id}>
                {ws.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Agent Grid */}
      {filteredAgents.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            No agents match the current filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
