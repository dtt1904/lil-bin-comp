export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) {
    const abs = Math.abs(diffMs);
    const mins = Math.floor(abs / 60_000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return "now";
    if (mins < 60) return `in ${mins}m`;
    if (hours < 24) return `in ${hours}h`;
    return `in ${days}d`;
  }

  const secs = Math.floor(diffMs / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (secs < 60) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    RUNNING: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    QUEUED: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    BLOCKED: "bg-red-500/15 text-red-400 border-red-500/20",
    AWAITING_APPROVAL: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    FAILED: "bg-red-500/15 text-red-400 border-red-500/20",
    COMPLETED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    BACKLOG: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  };
  return map[status] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    CRITICAL: "bg-red-500/15 text-red-400 border-red-500/20",
    HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    MEDIUM: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    LOW: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  };
  return map[priority] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
}

export function getAgentStatusColor(status: string): string {
  const map: Record<string, string> = {
    ONLINE: "text-emerald-400",
    BUSY: "text-blue-400",
    IDLE: "text-zinc-400",
    OFFLINE: "text-zinc-600",
    ERROR: "text-red-400",
    PAUSED: "text-amber-400",
  };
  return map[status] ?? "text-zinc-400";
}

export function getAgentStatusDotColor(status: string): string {
  const map: Record<string, string> = {
    ONLINE: "bg-emerald-400",
    BUSY: "bg-blue-400",
    IDLE: "bg-zinc-400",
    OFFLINE: "bg-zinc-600",
    ERROR: "bg-red-400",
    PAUSED: "bg-amber-400",
  };
  return map[status] ?? "bg-zinc-400";
}

export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    LOW: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
    MEDIUM: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    CRITICAL: "bg-red-500/15 text-red-400 border-red-500/20",
  };
  return map[severity] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
}

const AGENT_AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-orange-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-pink-600",
  "bg-lime-600",
  "bg-sky-600",
  "bg-fuchsia-600",
  "bg-red-600",
];

export function getAgentAvatarColor(name: string): string {
  let hash = 0;
  for (const char of name) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return AGENT_AVATAR_COLORS[Math.abs(hash) % AGENT_AVATAR_COLORS.length];
}
