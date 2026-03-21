"use client";

import { useState } from "react";
import {
  Settings2,
  HardDrive,
  FileSpreadsheet,
  Globe,
  CreditCard,
  Webhook,
  Calendar,
  Building,
  Users,
  Puzzle,
  Key,
  Trash2,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/helpers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const INTEGRATION_ICONS: Record<string, typeof Globe> = {
  GOOGLE_DRIVE: HardDrive,
  GOOGLE_SHEETS: FileSpreadsheet,
  META_FACEBOOK: Globe,
  STRIPE: CreditCard,
  WEBHOOK: Webhook,
  CUSTOM: Puzzle,
};

const INTEGRATION_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400",
  INACTIVE: "bg-zinc-500/15 text-zinc-400",
  ERROR: "bg-red-500/15 text-red-400",
};

const MODULE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400",
  INACTIVE: "bg-zinc-500/15 text-zinc-400",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-amber-500/15 text-amber-400",
  ADMIN: "bg-violet-500/15 text-violet-400",
  MANAGER: "bg-blue-500/15 text-blue-400",
  MEMBER: "bg-zinc-500/15 text-zinc-400",
  VIEWER: "bg-zinc-500/15 text-zinc-400",
};

function formatConfigSummary(config?: Record<string, unknown> | null): string {
  if (!config) return "No configuration";
  const entries = Object.entries(config);
  if (entries.length === 0) return "No configuration";
  return entries
    .slice(0, 3)
    .map(([key, val]) => {
      const label = key.replace(/([A-Z])/g, " $1").trim();
      if (typeof val === "boolean") return `${label}: ${val ? "Yes" : "No"}`;
      if (typeof val === "string") return `${label}: ${val}`;
      if (Array.isArray(val)) return `${label}: ${val.join(", ")}`;
      return `${label}: ${String(val)}`;
    })
    .join(" · ");
}

interface SerializedOrganization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SerializedIntegration {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  status: string;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
  workspace: { name: string } | null;
}

interface SerializedModuleInstallation {
  id: string;
  moduleType: string;
  workspaceId: string;
  config: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  workspace: { name: string } | null;
}

interface SerializedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface SerializedWorkspace {
  id: string;
  name: string;
  type: string;
}

interface SettingsPageClientProps {
  organization: SerializedOrganization;
  integrations: SerializedIntegration[];
  moduleInstallations: SerializedModuleInstallation[];
  users: SerializedUser[];
  workspaces: SerializedWorkspace[];
}

export function SettingsPageClient({
  organization,
  integrations,
  moduleInstallations,
  users,
  workspaces,
}: SettingsPageClientProps) {

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organization configuration, integrations, and team management
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={0}>
        <TabsList variant="line">
          <TabsTrigger value={0}>
            <Settings2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value={1}>
            <ExternalLink className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value={2}>
            <Puzzle className="h-4 w-4" />
            Modules
          </TabsTrigger>
          <TabsTrigger value={3}>
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value={4}>
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value={0} className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organization</CardTitle>
                  <CardDescription>
                    Basic organization information
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Organization Name
                  </label>
                  <p className="text-sm font-medium">{organization.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Slug
                  </label>
                  <p className="font-mono text-sm text-muted-foreground">
                    {organization.slug}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Created
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(organization.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Workspaces
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {workspaces.map((ws) => (
                      <div
                        key={ws.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm"
                      >
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{ws.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {ws.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value={1} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => {
              const Icon =
                INTEGRATION_ICONS[integration.type] ?? Puzzle;
              return (
                <Card key={integration.id}>
                  <CardContent className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium">
                            {integration.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {integration.type
                              .replace(/_/g, " ")
                              .toLowerCase()
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          INTEGRATION_STATUS_COLORS[integration.status]
                        )}
                      >
                        {integration.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {formatConfigSummary(
                        integration.config as Record<string, unknown>
                      )}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {integration.workspace?.name ?? "Organization-wide"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Added{" "}
                          {formatRelativeTime(
                            new Date(integration.createdAt)
                          )}
                        </span>
                      </div>
                      <Button variant="ghost" size="xs">
                        <Wrench className="h-3.5 w-3.5" />
                        Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value={2} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {moduleInstallations.map((mod) => (
              <Card key={mod.id}>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Puzzle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">
                          {mod.moduleType
                            .replace(/_/g, " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </h3>
                        <p className="font-mono text-xs text-muted-foreground">
                          {mod.moduleType}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        MODULE_STATUS_COLORS[mod.status]
                      )}
                    >
                      {mod.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {formatConfigSummary(
                      mod.config as Record<string, unknown> | null
                    )}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {mod.workspace?.name ?? mod.workspaceId}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Installed{" "}
                        {formatRelativeTime(new Date(mod.createdAt))}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="xs">
                        <Wrench className="h-3.5 w-3.5" />
                        Configure
                      </Button>
                      <Button variant="ghost" size="xs">
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        Uninstall
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value={3} className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    {users.length} members in your organization
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Users className="h-3.5 w-3.5" />
                  Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(ROLE_COLORS[user.role])}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(new Date(user.createdAt))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value={4} className="mt-6">
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <Key className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">
                  API Key Management
                </h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  API key management is coming soon. You&apos;ll be able to
                  create, rotate, and revoke API keys for programmatic
                  access to your agents and workflows.
                </p>
                <Button variant="outline" className="mt-6" disabled>
                  <Key className="h-4 w-4" />
                  Generate API Key
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
