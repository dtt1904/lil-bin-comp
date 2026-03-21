"use client";

import { Search, Bell } from "lucide-react";

export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      {/* Left — page title / breadcrumbs placeholder */}
      <div />

      {/* Right — actions */}
      <div className="flex items-center gap-1">
        {/* Search trigger */}
        <button className="flex h-8 items-center gap-2 rounded-md border border-border bg-accent/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/70">
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="pointer-events-none ml-1 hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User avatar */}
        <button className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground transition-opacity hover:opacity-80">
          T
        </button>
      </div>
    </header>
  );
}
