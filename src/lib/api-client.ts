const API_KEY = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || "lilbin-ops-key-2026-secure";

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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "x-organization-id": "org-1",
    ...(options.headers as Record<string, string> || {}),
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
