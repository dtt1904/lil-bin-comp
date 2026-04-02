"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api-client";

type PostMode = "dry_run" | "review" | "live";

interface PipelineCounts {
  draft: number;
  review: number;
  approved: number;
  scheduled: number;
  published: number;
  failed: number;
}

interface PublishedItem {
  id: string;
  platform: string;
  externalPostId: string | null;
  url: string | null;
  publishedAt: string;
  metrics: Record<string, unknown> | null;
  postDraft?: { title: string } | null;
}

interface LogItem {
  id: string;
  level: string;
  source: string;
  message: string;
  createdAt: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

interface FanpageClientProps {
  workspaceName: string;
  moduleInstalled: boolean;
  config: Record<string, unknown> | null;
  pipeline: PipelineCounts;
  recentPublished: PublishedItem[];
  recentLogs: LogItem[];
  activeTasks: TaskItem[];
}

const MODE_LABELS: Record<PostMode, { label: string; color: string; desc: string }> = {
  dry_run: {
    label: "Dry Run",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    desc: "Full pipeline runs but nothing posts to Facebook",
  },
  review: {
    label: "Review",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    desc: "Drafts are created but held for human approval",
  },
  live: {
    label: "Live",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    desc: "Full automation — approved posts go to Facebook",
  },
};

const PIPELINE_STAGES: { key: keyof PipelineCounts; label: string; icon: string }[] = [
  { key: "draft", label: "Discovered", icon: "🔍" },
  { key: "review", label: "Reviewing", icon: "📝" },
  { key: "approved", label: "Approved", icon: "✅" },
  { key: "scheduled", label: "Scheduled", icon: "📅" },
  { key: "published", label: "Published", icon: "🚀" },
  { key: "failed", label: "Failed", icon: "❌" },
];

const LOG_LEVEL_COLORS: Record<string, string> = {
  DEBUG: "text-zinc-500",
  INFO: "text-blue-400",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
  CRITICAL: "text-red-500 font-bold",
};

export function FanpageClient({
  workspaceName,
  moduleInstalled,
  config: initialConfig,
  pipeline,
  recentPublished,
  recentLogs,
  activeTasks,
}: FanpageClientProps) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pipeline" | "logs" | "published" | "tasks">("pipeline");

  const currentMode = ((config?.mode as string) ?? "dry_run") as PostMode;

  const updateMode = useCallback(
    async (mode: PostMode) => {
      setSaving(true);
      setError(null);
      const res = await api<{ config: Record<string, unknown> }>("/fanpage/config", {
        method: "PATCH",
        body: JSON.stringify({ mode }),
      });
      setSaving(false);
      if (res.ok && res.data) {
        setConfig(res.data.config ?? { ...config, mode });
      } else {
        setError(res.error ?? "Failed to update mode");
      }
    },
    [config]
  );

  const updateConfigFlag = useCallback(
    async (key: string, value: boolean) => {
      setSaving(true);
      setError(null);
      const res = await api<{ config: Record<string, unknown> }>("/fanpage/config", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      });
      setSaving(false);
      if (res.ok && res.data) {
        setConfig(res.data.config ?? { ...config, [key]: value });
      } else {
        setError(res.error ?? "Failed to update config");
      }
    },
    [config]
  );

  if (!moduleInstalled) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Fanpage Automation</h1>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-2">Module Not Installed</h2>
          <p className="text-zinc-400">
            The <code className="bg-zinc-700 px-1 rounded">social-media-manager</code> module is not
            installed for workspace <strong>{workspaceName}</strong>.
          </p>
          <p className="text-zinc-500 mt-2 text-sm">
            Install the module via workspace templates or API to enable fanpage automation.
          </p>
        </div>
      </div>
    );
  }

  const totalInPipeline = Object.values(pipeline).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fanpage Automation</h1>
          <p className="text-zinc-400 text-sm mt-1">{workspaceName}</p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-zinc-500 text-sm animate-pulse">Saving...</span>}
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${MODE_LABELS[currentMode].color}`}
          >
            {MODE_LABELS[currentMode].label}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Mode Selector */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Automation Mode
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(MODE_LABELS) as [PostMode, typeof MODE_LABELS[PostMode]][]).map(
            ([mode, info]) => (
              <button
                key={mode}
                onClick={() => updateMode(mode)}
                disabled={saving}
                className={`p-3 rounded-lg border text-left transition-all ${
                  currentMode === mode
                    ? info.color + " border-opacity-100"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                } disabled:opacity-50`}
              >
                <div className="font-medium text-sm">{info.label}</div>
                <div className="text-xs mt-1 opacity-70">{info.desc}</div>
              </button>
            )
          )}
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Pipeline Overview
          </h2>
          <span className="text-zinc-500 text-xs">{totalInPipeline} total items</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PIPELINE_STAGES.map((stage) => (
            <div
              key={stage.key}
              className="rounded-lg bg-zinc-900 border border-zinc-700/50 p-3 text-center"
            >
              <div className="text-lg mb-1">{stage.icon}</div>
              <div className="text-2xl font-bold text-zinc-100">{pipeline[stage.key]}</div>
              <div className="text-xs text-zinc-500 mt-1">{stage.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Config Toggles */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Pipeline Toggles
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: "autoDiscover", label: "Auto-Discover" },
            { key: "autoDraft", label: "Auto-Draft" },
            { key: "autoPost", label: "Auto-Post" },
            { key: "autoEngage", label: "Auto-Engage" },
          ].map(({ key, label }) => {
            const enabled = config?.[key] !== false;
            return (
              <button
                key={key}
                onClick={() => updateConfigFlag(key, !enabled)}
                disabled={saving}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  enabled
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-500"
                } disabled:opacity-50`}
              >
                {enabled ? "●" : "○"} {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-700 flex gap-1">
        {(
          [
            { id: "pipeline", label: "Recent Tasks" },
            { id: "logs", label: "Activity Log" },
            { id: "published", label: "Published Posts" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "pipeline" && (
        <div className="space-y-2">
          {activeTasks.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4 text-center">No pipeline tasks yet</p>
          ) : (
            activeTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
              >
                <div>
                  <div className="text-sm font-medium text-zinc-200">{task.title}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {task.labels.join(", ")} · {new Date(task.createdAt).toLocaleString()}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    task.status === "COMPLETED"
                      ? "bg-green-500/20 text-green-400"
                      : task.status === "FAILED"
                        ? "bg-red-500/20 text-red-400"
                        : task.status === "RUNNING"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-zinc-700 text-zinc-400"
                  }`}
                >
                  {task.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="space-y-1">
          {recentLogs.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4 text-center">No logs yet</p>
          ) : (
            recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2 rounded bg-zinc-800/30 text-sm"
              >
                <span className={`font-mono text-xs mt-0.5 w-12 ${LOG_LEVEL_COLORS[log.level] ?? "text-zinc-400"}`}>
                  {log.level}
                </span>
                <span className="text-zinc-500 font-mono text-xs mt-0.5 w-28 shrink-0">
                  {log.source}
                </span>
                <span className="text-zinc-300 flex-1">{log.message}</span>
                <span className="text-zinc-600 text-xs whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "published" && (
        <div className="space-y-2">
          {recentPublished.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4 text-center">No published posts yet</p>
          ) : (
            recentPublished.map((post) => (
              <div
                key={post.id}
                className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-zinc-200">
                    {post.postDraft?.title ?? post.externalPostId ?? "Post"}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(post.publishedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                  <span>{post.platform}</span>
                  {post.url && (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      View post
                    </a>
                  )}
                  {post.metrics && (
                    <span className="text-zinc-500">
                      {JSON.stringify(post.metrics)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
