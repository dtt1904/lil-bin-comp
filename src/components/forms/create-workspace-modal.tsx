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
import { api, slugify } from "@/lib/api-client";

type TemplateSummary = {
  id: string;
  label: string;
  summary: string;
  suggestedType: "HQ" | "CLIENT" | "INTERNAL";
};

export function CreateWorkspaceModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"HQ" | "CLIENT" | "INTERNAL">("CLIENT");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);

  async function loadTemplates() {
    const res = await api<TemplateSummary[]>("/workspaces/templates");
    if (res.ok && Array.isArray(res.data)) {
      setTemplates(res.data);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await api("/workspaces", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        slug: slugify(name),
        type,
        description: description.trim() || undefined,
        ...(templateId ? { templateId } : {}),
      }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Failed to create workspace");
      return;
    }
    setOpen(false);
    setName("");
    setType("CLIENT");
    setDescription("");
    setTemplateId("");
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void loadTemplates();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        Create Workspace
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            One workspace per client, company, fanpage, or BU. Departments are
            only teams inside this workspace — never use them to separate
            different clients.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. THV Insurance Marketing"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-template">Starter template (optional)</Label>
            <Select
              value={templateId || "__none__"}
              onValueChange={(v) => {
                const nextTemplateId = v === "__none__" || v == null ? "" : v;
                setTemplateId(nextTemplateId);
                const suggestedTemplate = templates.find(
                  (item) => item.id === nextTemplateId
                );
                if (suggestedTemplate) {
                  setType(suggestedTemplate.suggestedType);
                }
              }}
            >
              <SelectTrigger id="ws-template">
                <SelectValue placeholder="Blank workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Blank workspace</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templateId ? (
              <p className="text-xs text-muted-foreground">
                {templates.find((t) => t.id === templateId)?.summary}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType((v as "HQ" | "CLIENT" | "INTERNAL") ?? "CLIENT")}
            >
              <SelectTrigger id="ws-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HQ">HQ (lil_Bin internal)</SelectItem>
                <SelectItem value="CLIENT">Client / fanpage / BU</SelectItem>
                <SelectItem value="INTERNAL">Internal (non-client)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-desc">Description</Label>
            <Textarea
              id="ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
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
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
