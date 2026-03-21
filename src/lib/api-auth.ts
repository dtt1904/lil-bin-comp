import { NextRequest, NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

function requireEnvInProduction(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;

  if (isProduction) {
    throw new Error(
      `Environment variable ${name} is required in production but not set.`
    );
  }

  console.warn(
    `[api-auth] ${name} not set — using dev fallback. Do NOT rely on this in production.`
  );
  return devFallback;
}

const INTERNAL_API_KEY = requireEnvInProduction(
  "INTERNAL_API_KEY",
  "lilbin-dev-key-2024"
);

export interface AuthContext {
  apiKey: string;
  organizationId: string;
}

export function authenticateRequest(
  req: NextRequest
): { ok: true; ctx: AuthContext } | { ok: false; response: NextResponse } {
  const apiKey =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!apiKey || apiKey !== INTERNAL_API_KEY) {
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
