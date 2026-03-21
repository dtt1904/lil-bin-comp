"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";

const PLATFORMS = [
  { value: "FACEBOOK_PAGE", label: "Facebook Page" },
  { value: "FACEBOOK_GROUP", label: "Facebook Group" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "OTHER", label: "Other" },
] as const;

interface CreateDraftModalProps {
  workspaces: { id: string; name: string }[];
  listings: { id: string; address: string }[];
}

export function CreateDraftModal({
  workspaces,
  listings,
}: CreateDraftModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("FACEBOOK_PAGE");
  const [listingId, setListingId] = useState("");
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");

  function resetForm() {
    setTitle("");
    setContent("");
    setPlatform("FACEBOOK_PAGE");
    setListingId("");
    setWorkspaceId(workspaces[0]?.id ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }
    if (!workspaceId) {
      setError("Please select a workspace");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await api("/drafts", {
      method: "POST",
      body: JSON.stringify({
        title: title.trim(),
        content: content.trim(),
        platform,
        listingId: listingId || undefined,
        workspaceId,
      }),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error || "Failed to create draft");
      return;
    }

    setOpen(false);
    resetForm();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        Create Draft
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Draft</DialogTitle>
          <DialogDescription>
            Draft a new social media post for a listing
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dft-title">Title</Label>
            <Input
              id="dft-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dft-content">Content / Caption</Label>
            <Textarea
              id="dft-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post caption..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v ?? "FACEBOOK_PAGE")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Workspace</Label>
              <Select value={workspaceId} onValueChange={(v) => setWorkspaceId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {listings.length > 0 && (
            <div className="space-y-2">
              <Label>Listing (optional)</Label>
              <Select value={listingId} onValueChange={(v) => setListingId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {listings.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
