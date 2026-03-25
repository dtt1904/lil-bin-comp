import {
  ACTIVE_WORKSPACE_COOKIE,
} from "@/lib/workspace-constants";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/default-organization";

const STREAM_API_KEY =
  process.env.NEXT_PUBLIC_INTERNAL_API_KEY || "lilbin-ops-key-2026-secure";

function readActiveWorkspaceCookie(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const m = document.cookie.match(
    new RegExp(
      `(?:^|; )${ACTIVE_WORKSPACE_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`
    )
  );
  const raw = m?.[1];
  return raw ? decodeURIComponent(raw) : undefined;
}

export function streamUrl(path: string, extraParams?: Record<string, string>) {
  const ws = readActiveWorkspaceCookie();
  const params = new URLSearchParams({
    apiKey: STREAM_API_KEY,
    organizationId: DEFAULT_ORGANIZATION_ID,
    ...(ws ? { workspaceId: ws } : {}),
    ...(extraParams ?? {}),
  });
  return `/api/v1/stream${path}?${params.toString()}`;
}
