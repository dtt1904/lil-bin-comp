"use client";

import { ChevronDown } from "lucide-react";

export function WorkspaceSwitcher() {
  return (
    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/50">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
        HQ
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">HQ</p>
        <p className="truncate text-[11px] text-muted-foreground">
          Trung AI Ops
        </p>
      </div>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
