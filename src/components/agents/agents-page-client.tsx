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
import { AgentCard, type AgentCardData } from "@/components/agents/agent-card";

const STATUS_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Online", value: "ONLINE" },
  { label: "Busy", value: "BUSY" },
  { label: "Idle", value: "IDLE" },
  { label: "Offline", value: "OFFLINE" },
  { label: "Error", value: "ERROR" },
  { label: "Paused", value: "PAUSED" },
];

interface WorkspaceOption {
  id: string;
  name: string;
}

interface AgentsPageClientProps {
  agents: AgentCardData[];
  workspaces: WorkspaceOption[];
  totalAgentCount: number;
}

export function AgentsPageClient({
  agents,
  workspaces,
  totalAgentCount,
}: AgentsPageClientProps) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesStatus =
        statusFilter === "ALL" || agent.status === statusFilter;
      const matchesWorkspace =
        workspaceFilter === "all" || agent.workspaceName === workspaceFilter;
      return matchesStatus && matchesWorkspace;
    });
  }, [agents, statusFilter, workspaceFilter]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Agent Directory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalAgentCount} agents across {workspaces.length} workspaces
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Create Agent
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
              <SelectItem key={ws.id} value={ws.name}>
                {ws.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
