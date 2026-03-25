/**
 * Facebook Graph API client for Page posting and engagement.
 *
 * All operations support dry-run mode. Tokens are never hardcoded —
 * they come from IntegrationAccount rows in the database.
 */

export interface FBPostPayload {
  message: string;
  link?: string;
  mediaUrl?: string;
}

export interface FBPostResult {
  postId: string;
  url: string;
}

export interface FBComment {
  id: string;
  message: string;
  fromName: string;
  fromId: string;
  createdTime: string;
}

export interface FBPostMetrics {
  likes: number;
  comments: number;
  shares: number;
  reach?: number;
}

const GRAPH_API = "https://graph.facebook.com/v19.0";

async function graphFetch<T>(
  url: string,
  opts?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, opts);
    const json = await res.json();
    if (!res.ok) {
      const msg =
        json?.error?.message ?? json?.error ?? `HTTP ${res.status}`;
      return { ok: false, error: `Graph API error: ${msg}` };
    }
    return { ok: true, data: json as T };
  } catch (err) {
    return {
      ok: false,
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function postToPage(
  pageId: string,
  token: string,
  payload: FBPostPayload,
  dryRun = false
): Promise<{ ok: true; result: FBPostResult } | { ok: false; error: string }> {
  if (dryRun) {
    const mockId = `dry_${Date.now()}`;
    console.log(
      `[fb] DRY RUN — would post to page ${pageId}: "${payload.message.slice(0, 80)}..."`
    );
    return {
      ok: true,
      result: {
        postId: mockId,
        url: `https://facebook.com/${pageId}/posts/${mockId}`,
      },
    };
  }

  const params = new URLSearchParams({
    message: payload.message,
    access_token: token,
  });
  if (payload.link) params.set("link", payload.link);

  const res = await graphFetch<{ id: string }>(
    `${GRAPH_API}/${pageId}/feed`,
    { method: "POST", body: params }
  );

  if (!res.ok) return res;

  return {
    ok: true,
    result: {
      postId: res.data.id,
      url: `https://facebook.com/${res.data.id.replace("_", "/posts/")}`,
    },
  };
}

export async function getPageComments(
  postId: string,
  token: string,
  since?: Date
): Promise<FBComment[]> {
  const params = new URLSearchParams({
    access_token: token,
    fields: "id,message,from,created_time",
    limit: "50",
  });
  if (since) params.set("since", Math.floor(since.getTime() / 1000).toString());

  const res = await graphFetch<{ data: Array<{
    id: string;
    message: string;
    from?: { name: string; id: string };
    created_time: string;
  }> }>(`${GRAPH_API}/${postId}/comments?${params}`);

  if (!res.ok) {
    console.error(`[fb] Failed to get comments for ${postId}: ${res.error}`);
    return [];
  }

  return res.data.data.map((c) => ({
    id: c.id,
    message: c.message,
    fromName: c.from?.name ?? "Unknown",
    fromId: c.from?.id ?? "",
    createdTime: c.created_time,
  }));
}

export async function getPostMetrics(
  postId: string,
  token: string
): Promise<FBPostMetrics> {
  const params = new URLSearchParams({
    access_token: token,
    fields: "likes.summary(true),comments.summary(true),shares",
  });

  const res = await graphFetch<{
    likes?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
    shares?: { count?: number };
  }>(`${GRAPH_API}/${postId}?${params}`);

  if (!res.ok) {
    console.error(`[fb] Failed to get metrics for ${postId}: ${res.error}`);
    return { likes: 0, comments: 0, shares: 0 };
  }

  return {
    likes: res.data.likes?.summary?.total_count ?? 0,
    comments: res.data.comments?.summary?.total_count ?? 0,
    shares: res.data.shares?.count ?? 0,
  };
}
