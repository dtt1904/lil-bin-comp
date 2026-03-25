const STREAM_API_KEY =
  process.env.NEXT_PUBLIC_INTERNAL_API_KEY || "lilbin-ops-key-2026-secure";

export function streamUrl(path: string, extraParams?: Record<string, string>) {
  const params = new URLSearchParams({
    apiKey: STREAM_API_KEY,
    organizationId: "org-1",
    ...(extraParams ?? {}),
  });
  return `/api/v1/stream${path}?${params.toString()}`;
}
