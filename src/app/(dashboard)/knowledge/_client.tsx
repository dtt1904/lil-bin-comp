"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Brain,
  FileText,
  Code2,
  Plus,
  ChevronDown,
  ChevronRight,
  Tag,
  Globe,
  Lock,
  Building,
  Calendar,
  Sparkles,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MEMORY_TYPE_COLORS: Record<string, string> = {
  NOTE: "bg-blue-500/15 text-blue-400",
  CONTEXT: "bg-emerald-500/15 text-emerald-400",
  FACT: "bg-amber-500/15 text-amber-400",
  PREFERENCE: "bg-violet-500/15 text-violet-400",
  INSTRUCTION: "bg-rose-500/15 text-rose-400",
};

const VISIBILITY_COLORS: Record<string, string> = {
  PRIVATE: "bg-zinc-500/15 text-zinc-400",
  WORKSPACE: "bg-cyan-500/15 text-cyan-400",
  GLOBAL: "bg-emerald-500/15 text-emerald-400",
};

const VISIBILITY_ICONS: Record<string, typeof Lock> = {
  PRIVATE: Lock,
  WORKSPACE: Building,
  GLOBAL: Globe,
};

const MEMORY_TYPES = ["NOTE", "CONTEXT", "FACT", "PREFERENCE", "INSTRUCTION"];
const VISIBILITY_VALUES = ["PRIVATE", "WORKSPACE", "GLOBAL"];

interface SerializedMemoryEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  visibility: string;
  tags: string[];
  workspaceId: string | null;
  ownerAgentId: string | null;
  createdAt: string;
  updatedAt: string;
  workspace: { name: string } | null;
  ownerAgent: { name: string } | null;
}

interface SerializedSOPDocument {
  id: string;
  title: string;
  content: string;
  version: number;
  visibility: string;
  workspaceId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  workspace: { name: string } | null;
}

interface SerializedPromptTemplate {
  id: string;
  name: string;
  description: string | null;
  template: string;
  variables: string[];
  visibility: string;
  workspaceId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  workspace: { name: string } | null;
}

interface KnowledgePageClientProps {
  memories: SerializedMemoryEntry[];
  sops: SerializedSOPDocument[];
  prompts: SerializedPromptTemplate[];
}

export function KnowledgePageClient({
  memories,
  sops,
  prompts,
}: KnowledgePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !m.title.toLowerCase().includes(q) &&
          !m.content.toLowerCase().includes(q) &&
          !m.tags.some((t) => t.toLowerCase().includes(q))
        )
          return false;
      }
      if (typeFilter !== "ALL" && m.type !== typeFilter) return false;
      if (visibilityFilter !== "ALL" && m.visibility !== visibilityFilter)
        return false;
      return true;
    });
  }, [memories, searchQuery, typeFilter, visibilityFilter]);

  const filteredSOPs = useMemo(() => {
    if (!searchQuery) return sops;
    const q = searchQuery.toLowerCase();
    return sops.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q)
    );
  }, [sops, searchQuery]);

  const filteredPrompts = useMemo(() => {
    if (!searchQuery) return prompts;
    const q = searchQuery.toLowerCase();
    return prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.template.toLowerCase().includes(q)
    );
  }, [prompts, searchQuery]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Knowledge Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {memories.length} memories &middot; {sops.length} SOPs
            &middot; {prompts.length} prompts
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button />}>
            <Plus className="h-4 w-4" />
            Create
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Brain className="h-4 w-4" /> New Memory
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText className="h-4 w-4" /> New SOP
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Sparkles className="h-4 w-4" /> New Prompt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={0}>
        <TabsList variant="line">
          <TabsTrigger value={0}>
            <Brain className="h-4 w-4" />
            Memory
          </TabsTrigger>
          <TabsTrigger value={1}>
            <FileText className="h-4 w-4" />
            SOPs
          </TabsTrigger>
          <TabsTrigger value={2}>
            <Code2 className="h-4 w-4" />
            Prompts
          </TabsTrigger>
        </TabsList>

        {/* Memory Tab */}
        <TabsContent value={0} className="mt-6 space-y-6">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["ALL", ...MEMORY_TYPES].map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                    typeFilter === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {type === "ALL"
                    ? "All Types"
                    : type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {["ALL", ...VISIBILITY_VALUES].map((vis) => {
                const Icon = vis !== "ALL" ? VISIBILITY_ICONS[vis] : Globe;
                return (
                  <button
                    key={vis}
                    onClick={() => setVisibilityFilter(vis)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                      visibilityFilter === vis
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {vis !== "ALL" && Icon && (
                      <Icon className="h-3 w-3" />
                    )}
                    {vis === "ALL"
                      ? "All"
                      : vis.charAt(0) + vis.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Memory List */}
          <div className="space-y-3">
            {filteredMemories.map((memory) => {
              const isExpanded = expandedId === memory.id;
              return (
                <Card
                  key={memory.id}
                  className="cursor-pointer transition-all hover:ring-foreground/20"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : memory.id)
                  }
                >
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <h3 className="truncate font-medium">
                          {memory.title}
                        </h3>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          className={cn(
                            MEMORY_TYPE_COLORS[memory.type]
                          )}
                        >
                          {memory.type}
                        </Badge>
                        <Badge
                          className={cn(
                            VISIBILITY_COLORS[memory.visibility]
                          )}
                        >
                          {memory.visibility}
                        </Badge>
                      </div>
                    </div>

                    {!isExpanded && (
                      <p className="ml-6 line-clamp-2 text-sm text-muted-foreground">
                        {memory.content}
                      </p>
                    )}

                    {isExpanded && (
                      <div className="ml-6 space-y-3 border-l-2 border-border/50 pl-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {memory.content}
                        </p>
                        {memory.ownerAgent && (
                          <div className="text-xs text-muted-foreground">
                            Owner: {memory.ownerAgent.name}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="ml-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      {memory.tags.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-3 w-3" />
                          {memory.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-muted px-1.5 py-0.5"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {memory.workspace?.name ?? "Global"}
                      </span>
                      {memory.ownerAgent && (
                        <span className="flex items-center gap-1">
                          {memory.ownerAgent.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatRelativeTime(new Date(memory.createdAt))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredMemories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Brain className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">No memories match your filters</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* SOPs Tab */}
        <TabsContent value={1} className="mt-6 space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search SOPs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredSOPs.map((sop) => {
              const isExpanded = expandedId === sop.id;
              return (
                <Card
                  key={sop.id}
                  className="cursor-pointer transition-all hover:ring-foreground/20"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : sop.id)
                  }
                >
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-medium">{sop.title}</h3>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">v{sop.version}</Badge>
                        <Badge
                          className={cn(
                            VISIBILITY_COLORS[sop.visibility]
                          )}
                        >
                          {sop.visibility}
                        </Badge>
                      </div>
                    </div>

                    {!isExpanded ? (
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {sop.content
                          .replace(/[#*]/g, "")
                          .substring(0, 200)}
                        ...
                      </p>
                    ) : (
                      <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                        {sop.content}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {sop.workspace?.name ?? "Global"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Updated {formatRelativeTime(new Date(sop.updatedAt))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredSOPs.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">No SOPs found</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value={2} className="mt-6 space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-4">
            {filteredPrompts.map((prompt) => {
              const isExpanded = expandedId === prompt.id;
              return (
                <Card
                  key={prompt.id}
                  className="cursor-pointer transition-all hover:ring-foreground/20"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : prompt.id)
                  }
                >
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{prompt.name}</h3>
                        {prompt.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {prompt.description}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          VISIBILITY_COLORS[prompt.visibility]
                        )}
                      >
                        {prompt.visibility}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {prompt.variables.map((v) => (
                        <span
                          key={v}
                          className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 font-mono text-xs text-violet-400"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>

                    <div
                      className={cn(
                        "rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed text-muted-foreground",
                        !isExpanded && "line-clamp-3"
                      )}
                    >
                      {prompt.template}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {prompt.workspace?.name ?? "Global"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Updated {formatRelativeTime(new Date(prompt.updatedAt))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredPrompts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Code2 className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">No prompts found</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
