"use client";

import { useEffect, useState } from "react";
import { Search, Bell } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import { streamUrl } from "@/lib/live-stream";
import { api } from "@/lib/api-client";

interface NotificationItem {
  id: string;
  read?: boolean;
}

interface NotificationStreamPayload {
  data?: {
    unreadCount?: number;
  };
}

export function Topbar() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      const id = setInterval(async () => {
        const res = await api<NotificationItem[]>(
          "/notifications?isRead=false&limit=50"
        );
        if (res.ok && res.data) {
          setUnreadCount(res.data.length);
        }
      }, 6000);
      return () => clearInterval(id);
    }

    const es = new EventSource(streamUrl("/notifications"));
    es.addEventListener("notifications", (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data);
        const payload = parsed as NotificationStreamPayload;
        const count = payload.data?.unreadCount;
        if (typeof count === "number") setUnreadCount(count);
      } catch {
        // ignore
      }
    });
    return () => es.close();
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-background/90 px-3 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2">
        <MobileNav />
      </div>

      <div className="flex items-center gap-1">
        <button className="flex h-8 items-center gap-2 rounded-md border border-border bg-accent/40 px-2 sm:px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/70">
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="pointer-events-none ml-1 hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </button>

        <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <button className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground transition-opacity hover:opacity-80">
          T
        </button>
      </div>
    </header>
  );
}
