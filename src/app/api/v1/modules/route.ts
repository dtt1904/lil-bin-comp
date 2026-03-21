import { NextRequest } from "next/server";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
  parseSearchParams,
} from "@/lib/api-auth";
import { store, generateId } from "@/lib/store";
import type { ModuleInstallation, LogEvent } from "@/lib/types";
import { ModuleStatus, LogLevel } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const q = parseSearchParams(req);
  let results = store.moduleInstallations;

  if (q.workspaceId) {
    results = store.filter(results, (m) => m.workspaceId === q.workspaceId);
  }
  if (q.status) {
    results = store.filter(results, (m) => m.status === q.status);
  }

  const total = results.length;
  const limit = parseInt(q.limit || "50", 10);
  const offset = parseInt(q.offset || "0", 10);
  const page = results.slice(offset, offset + limit);

  return jsonResponse({ data: page, meta: { total, limit, offset } });
}

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.workspaceId || !body.moduleSlug || !body.moduleName) {
    return errorResponse(
      "workspaceId, moduleSlug, and moduleName are required",
    );
  }

  const duplicate = store.moduleInstallations.find(
    (m) =>
      m.moduleSlug === body.moduleSlug && m.workspaceId === body.workspaceId,
  );
  if (duplicate) {
    return errorResponse(
      `Module "${body.moduleSlug}" is already installed in workspace ${body.workspaceId}`,
      409,
    );
  }

  const installation: ModuleInstallation = {
    id: generateId("mod"),
    workspaceId: body.workspaceId,
    moduleSlug: body.moduleSlug,
    moduleName: body.moduleName,
    version: body.version ?? "1.0.0",
    status: ModuleStatus.ACTIVE,
    config: body.config,
    installedById: "user-1",
    installedAt: new Date(),
    updatedAt: new Date(),
  };

  store.insert(store.moduleInstallations, installation);

  const logEvent: LogEvent = {
    id: generateId("log"),
    organizationId: auth.ctx.organizationId,
    workspaceId: body.workspaceId,
    level: LogLevel.INFO,
    message: `Module "${body.moduleName}" (${body.moduleSlug}) v${installation.version} installed`,
    metadata: { moduleId: installation.id, moduleSlug: body.moduleSlug },
    timestamp: new Date(),
  };
  store.insert(store.logEvents, logEvent);

  return jsonResponse({ data: installation }, 201);
}
