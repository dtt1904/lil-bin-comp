"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, setActiveWorkspaceCookie } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
};

function workspaceInitial(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "WS";
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [list, setList] = useState<WorkspaceRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadWorkspaces = async () => {
      const res = await api<WorkspaceRow[]>("/workspaces?limit=100");
      if (!isMounted) return;

      if (!res.ok || !res.data) {
        setList([]);
        setLoading(false);
        return;
      }

      const rows = Array.isArray(res.data) ? res.data : [];
      setList(rows);

      const fromCookie =
        typeof document !== "undefined"
          ? document.cookie.match(/(?:^|; )lilbin_active_workspace=([^;]*)/)?.[1]
          : undefined;
      const decoded = fromCookie ? decodeURIComponent(fromCookie) : "";
      const pick =
        decoded && rows.some((w) => w.id === decoded)
          ? decoded
          : rows[0]?.id ?? null;
      if (pick) {
        setActiveId(pick);
        setActiveWorkspaceCookie(pick);
      }
      setLoading(false);
    };

    void loadWorkspaces();

    return () => {
      isMounted = false;
    };
  }, []);

  const active = list.find((w) => w.id === activeId) ?? null;

  function select(id: string) {
    setActiveId(id);
    setActiveWorkspaceCookie(id);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
              "hover:bg-accent/50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          />
        }
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            workspaceInitial(active?.name ?? "WS")
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {loading ? "Loading…" : active?.name ?? "Select workspace"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {active
              ? `${active.type} · ${active.slug}`
              : "Each client / BU is a workspace"}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56" align="start">
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Active client workspace — departments are teams inside it only
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {list.length === 0 && !loading ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No workspaces yet. Create one under Workspaces.
          </div>
        ) : (
          list.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onClick={() => select(w.id)}
              className="flex items-center gap-2"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold">
                {workspaceInitial(w.name)}
              </span>
              <span className="min-w-0 flex-1 truncate">{w.name}</span>
              {w.id === activeId && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
