"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Archive, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskActionsProps {
  taskId: string;
  currentStatus: string;
  title: string;
  description?: string | null;
  priority: string;
  dueDate?: string | null;
}

export function TaskActions({
  taskId,
  currentStatus,
  title,
  description,
  priority,
  dueDate,
}: TaskActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editPriority, setEditPriority] = useState(priority);
  const [editStatus, setEditStatus] = useState(currentStatus);
  const [editDueDate, setEditDueDate] = useState(
    dueDate ? new Date(dueDate).toISOString().slice(0, 10) : ""
  );

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

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditError("Title is required");
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    const result = await api(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        priority: editPriority,
        status: editStatus,
        dueDate: editDueDate
          ? new Date(`${editDueDate}T00:00:00.000Z`).toISOString()
          : null,
      }),
    });
    setSavingEdit(false);
    if (!result.ok) {
      setEditError(result.error || "Failed to update task");
      return;
    }
    setEditOpen(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
          <Pencil className="h-4 w-4" />
          Edit
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details and status.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSaveEdit}>
            <div className="space-y-2">
              <Label htmlFor="edit-task-title">Title</Label>
              <Input
                id="edit-task-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-task-description">Description</Label>
              <Textarea
                id="edit-task-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={editPriority} onValueChange={(v) => setEditPriority(v ?? editPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                    <SelectItem value="HIGH">HIGH</SelectItem>
                    <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                    <SelectItem value="LOW">LOW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v ?? editStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BACKLOG">BACKLOG</SelectItem>
                    <SelectItem value="QUEUED">QUEUED</SelectItem>
                    <SelectItem value="RUNNING">RUNNING</SelectItem>
                    <SelectItem value="BLOCKED">BLOCKED</SelectItem>
                    <SelectItem value="AWAITING_APPROVAL">AWAITING_APPROVAL</SelectItem>
                    <SelectItem value="FAILED">FAILED</SelectItem>
                    <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-task-due-date">Due Date</Label>
                <Input
                  id="edit-task-due-date"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>
            </div>
            {editError && (
              <p className="text-sm text-destructive">{editError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
