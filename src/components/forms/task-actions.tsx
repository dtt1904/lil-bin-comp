"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

interface TaskActionsProps {
  taskId: string;
  currentStatus: string;
}

export function TaskActions({ taskId, currentStatus }: TaskActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(newStatus: string) {
    setLoading(newStatus);
    const result = await api(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    setLoading(null);
    if (!result.ok) {
      alert(result.error || "Failed to update task");
      return;
    }
    router.refresh();
  }

  const showApprove = currentStatus === "AWAITING_APPROVAL";
  const showRetry = currentStatus === "FAILED";
  const showArchive = !["ARCHIVED", "COMPLETED"].includes(currentStatus);

  return (
    <div className="flex items-center gap-2">
      {showApprove && (
        <Button
          size="sm"
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          disabled={!!loading}
          onClick={() => updateStatus("COMPLETED")}
        >
          {loading === "COMPLETED" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Approve
        </Button>
      )}
      {showRetry && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!!loading}
          onClick={() => updateStatus("QUEUED")}
        >
          {loading === "QUEUED" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Retry
        </Button>
      )}
      {showArchive && (
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-muted-foreground"
          disabled={!!loading}
          onClick={() => updateStatus("ARCHIVED")}
        >
          {loading === "ARCHIVED" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          Archive
        </Button>
      )}
    </div>
  );
}
