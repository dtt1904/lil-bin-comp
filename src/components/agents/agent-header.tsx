import { Badge } from "@/components/ui/badge";
import {
  getAgentStatusDotColor,
  getAgentAvatarColor,
  getAgentStatusColor,
} from "@/lib/helpers";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  return name
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function extractRole(description?: string | null): string {
  if (!description) return "Agent";
  const parts = description.split("—");
  return parts[0]?.trim() || "Agent";
}

export interface AgentHeaderData {
  name: string;
  slug: string;
  description: string | null;
  status: string;
  role: string;
}

interface AgentHeaderProps {
  agent: AgentHeaderData;
}

export function AgentHeader({ agent }: AgentHeaderProps) {
  return (
    <div className="flex items-start gap-5">
      <div
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white",
          getAgentAvatarColor(agent.name)
        )}
      >
        {getInitials(agent.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {agent.name}
          </h1>
          <span className="text-sm text-muted-foreground">@{agent.slug}</span>
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                getAgentStatusDotColor(agent.status)
              )}
            />
            <span
              className={cn("text-sm font-medium", getAgentStatusColor(agent.status))}
            >
              {agent.status}
            </span>
          </div>
        </div>
        <p className="mt-0.5 text-sm font-medium text-muted-foreground">
          {extractRole(agent.description)}
        </p>
        {agent.description && (
          <p className="mt-1 text-sm text-muted-foreground/80 line-clamp-2">
            {agent.description.split("—").slice(1).join("—").trim()}
          </p>
        )}
        {agent.role && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              {agent.role}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
