"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { api, slugify } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateAgentModalProps {
  workspaces: { id: string; name: string }[];
}

const INITIAL_FORM = {
  name: "",
  role: "",
  workspaceId: "",
  provider: "",
  model: "",
  systemPrompt: "",
  description: "",
};

export function CreateAgentModal({ workspaces }: CreateAgentModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: string, value: string | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.role.trim() || !form.workspaceId || !form.systemPrompt.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await api("/agents", {
      method: "POST",
      body: JSON.stringify({
        name: form.name.trim(),
        slug: slugify(form.name.trim()),
        role: form.role.trim(),
        workspaceId: form.workspaceId,
        provider: form.provider.trim() || undefined,
        model: form.model.trim() || undefined,
        systemPrompt: form.systemPrompt.trim(),
        description: form.description.trim() || undefined,
      }),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to create agent.");
      return;
    }

    setOpen(false);
    setForm(INITIAL_FORM);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        Create Agent
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Agent</DialogTitle>
          <DialogDescription>
            Add a new AI agent to your workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="agent-name">Name *</Label>
            <Input
              id="agent-name"
              placeholder="e.g. Blog Writer"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-role">Role *</Label>
            <Input
              id="agent-role"
              placeholder="e.g. content-writer, photographer"
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Workspace *</Label>
            <Select value={form.workspaceId} onValueChange={(v) => update("workspaceId", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select workspace" />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="agent-provider">Provider</Label>
              <Input
                id="agent-provider"
                placeholder="e.g. openai"
                value={form.provider}
                onChange={(e) => update("provider", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agent-model">Model</Label>
              <Input
                id="agent-model"
                placeholder="e.g. gpt-4o"
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-system-prompt">System Prompt *</Label>
            <Textarea
              id="agent-system-prompt"
              placeholder="Describe what this agent should do..."
              rows={3}
              value={form.systemPrompt}
              onChange={(e) => update("systemPrompt", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-description">Description</Label>
            <Textarea
              id="agent-description"
              placeholder="Optional description"
              rows={2}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating…" : "Create Agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
