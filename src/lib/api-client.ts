import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_HEADER,
} from "@/lib/workspace-constants";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/default-organization";

const API_KEY = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || "lilbin-ops-key-2026-secure";

function readActiveWorkspaceCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(
    new RegExp(
      `(?:^|; )${ACTIVE_WORKSPACE_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`
    )
  );
  const raw = m?.[1];
  return raw ? decodeURIComponent(raw) : undefined;
}

/** Persist active client workspace for API + SSE scope (1 year, SameSite=Lax). */
export function setActiveWorkspaceCookie(workspaceId: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ACTIVE_WORKSPACE_COOKIE}=${encodeURIComponent(workspaceId)}; path=/; max-age=31536000; SameSite=Lax`;
}

export interface ApiResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const ws = readActiveWorkspaceCookie();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "x-organization-id": DEFAULT_ORGANIZATION_ID,
    ...(ws ? { [ACTIVE_WORKSPACE_HEADER]: ws } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  try {
    const res = await fetch(`/api/v1${path}`, {
      ...options,
      headers,
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: json.error || `Request failed (${res.status})`,
        details: json.details,
      };
    }

    return { ok: true, data: json.data ?? json };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
