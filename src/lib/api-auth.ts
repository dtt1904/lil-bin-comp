import { NextRequest, NextResponse } from "next/server";

function isProductionDeploy(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

const DEV_API_KEY_FALLBACK = "lilbin-dev-key-2024";

/**
 * Resolves the expected API key at request time (not at module load) so production
 * builds and analysis do not throw when INTERNAL_API_KEY is unset during `next build`.
 */
let cachedExpectedKey: string | null | undefined;

function getExpectedInternalApiKey(): string | null {
  if (cachedExpectedKey !== undefined) {
    return cachedExpectedKey;
  }

  const fromEnv = process.env.INTERNAL_API_KEY;
  if (fromEnv && fromEnv.length > 0) {
    cachedExpectedKey = fromEnv;
    return fromEnv;
  }

  if (isProductionDeploy()) {
    cachedExpectedKey = null;
    return null;
  }

  console.warn(
    `[api-auth] INTERNAL_API_KEY not set — using dev-only fallback "${DEV_API_KEY_FALLBACK}". Do not use in production.`
  );
  cachedExpectedKey = DEV_API_KEY_FALLBACK;
  return cachedExpectedKey;
}

export interface AuthContext {
  apiKey: string;
  organizationId: string;
}

function resolveApiKey(req: NextRequest): string | null {
  return (
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.nextUrl.searchParams.get("apiKey")
  );
}

export function authenticateRequest(
  req: NextRequest
): { ok: true; ctx: AuthContext } | { ok: false; response: NextResponse } {
  const expected = getExpectedInternalApiKey();
  if (expected === null) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "server_misconfigured",
          message:
            "INTERNAL_API_KEY must be set in production. Configure it in your deployment environment.",
        },
        { status: 503 }
      ),
    };
  }

  const apiKey = resolveApiKey(req);

  if (!apiKey || apiKey !== expected) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "unauthorized",
          message: "Missing or invalid API key. Provide x-api-key header.",
        },
        { status: 401 }
      ),
    };
  }

  const organizationId =
    req.headers.get("x-organization-id") || "org-1";

  return {
    ok: true,
    ctx: { apiKey, organizationId },
  };
}

export function authenticateStreamRequest(
  req: NextRequest
): { ok: true; ctx: AuthContext } | { ok: false; response: NextResponse } {
  const expected = getExpectedInternalApiKey();
  if (expected === null) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "server_misconfigured",
          message:
            "INTERNAL_API_KEY must be set in production. Configure it in your deployment environment.",
        },
        { status: 503 }
      ),
    };
  }

  const apiKey = resolveApiKey(req);

  if (!apiKey || apiKey !== expected) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "unauthorized",
          message:
            "Missing or invalid API key. Provide x-api-key header or apiKey query param.",
        },
        { status: 401 }
      ),
    };
  }

  const organizationId =
    req.headers.get("x-organization-id") ||
    req.nextUrl.searchParams.get("organizationId") ||
    "org-1";

  return {
    ok: true,
    ctx: { apiKey, organizationId },
  };
}

export function jsonResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(
  message: string,
  status = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json({ error: message, details }, { status });
}

export function parseSearchParams(
  req: NextRequest
): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
