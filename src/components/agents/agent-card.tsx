import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAgentStatusDotColor, getAgentAvatarColor } from "@/lib/helpers";
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

export interface AgentCardData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  provider: string;
  model: string;
  workspaceName: string | null;
  currentTaskTitle: string | null;
}

interface AgentCardProps {
  agent: AgentCardData;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.id}`} className="block">
      <Card className="group cursor-pointer transition-all hover:ring-foreground/20">
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white",
                getAgentAvatarColor(agent.name)
              )}
            >
              {getInitials(agent.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold tracking-tight group-hover:text-primary transition-colors">
                  {agent.name}
                </h3>
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      getAgentStatusDotColor(agent.status)
                    )}
                  />
                  <span className="text-xs text-muted-foreground">
                    {agent.status.toLowerCase()}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">@{agent.slug}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {extractRole(agent.description)}
          </p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              {agent.provider === "openai" ? "OpenAI" : "Anthropic"} /{" "}
              {agent.model.includes("gpt-4o-mini")
                ? "GPT-4o Mini"
                : agent.model.includes("gpt-4o")
                  ? "GPT-4o"
                  : agent.model.includes("claude")
                    ? "Claude Sonnet"
                    : agent.model}
            </Badge>
          </div>

          {agent.workspaceName && (
            <div className="text-xs text-muted-foreground">
              <span className="text-muted-foreground/60">Workspace:</span>{" "}
              {agent.workspaceName}
            </div>
          )}

          {agent.currentTaskTitle && (
            <div className="rounded-md border border-blue-500/20 bg-blue-500/5 px-2.5 py-1.5 text-xs text-blue-400">
              <span className="text-blue-400/60">Running:</span>{" "}
              <span className="line-clamp-1">{agent.currentTaskTitle}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
