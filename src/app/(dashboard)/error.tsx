"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] unhandled page error:", error);
  }, [error]);

  const isDbError =
    error.message?.includes("does not exist") ||
    error.message?.includes("column") ||
    error.message?.includes("relation") ||
    error.message?.includes("prisma") ||
    error.message?.includes("database");

  return (
    <div className="mx-auto max-w-2xl py-16">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground">
              {isDbError
                ? "This page failed to load due to a database issue. This is usually caused by a pending migration that hasn't been deployed yet."
                : "This page encountered an unexpected error. You can try reloading."}
            </p>

            {isDbError && (
              <div className="rounded-md bg-black/10 px-3 py-2">
                <p className="text-xs text-amber-400/80">
                  Deployer action: run{" "}
                  <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono">
                    npx prisma migrate deploy
                  </code>{" "}
                  against the production database.
                </p>
              </div>
            )}

            <details className="pt-1">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Technical details
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-black/20 p-3 font-mono text-xs text-muted-foreground">
                {error.message}
              </pre>
              {error.digest && (
                <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
                  Digest: {error.digest}
                </p>
              )}
            </details>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Try again
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (window.location.href = "/workspaces")}
              >
                Go to Workspaces
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
