import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { effectiveWorkspaceId } from "@/lib/workspace-request";
import { prisma } from "@/lib/db";

const VALID_MODES = ["dry_run", "review", "live"] as const;

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const workspaceId = effectiveWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId required" },
      { status: 400 }
    );
  }

  try {
    const installation = await prisma.moduleInstallation.findFirst({
      where: {
        workspaceId,
        moduleType: "social-media-manager",
      },
      select: { id: true, config: true, status: true, updatedAt: true },
    });

    if (!installation) {
      return NextResponse.json(
        { error: "social-media-manager module not installed for this workspace" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: installation });
  } catch (err) {
    console.error("[fanpage/config] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const workspaceId = effectiveWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId required" },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.mode && !VALID_MODES.includes(body.mode as typeof VALID_MODES[number])) {
    return NextResponse.json(
      { error: `Invalid mode. Must be one of: ${VALID_MODES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.moduleInstallation.findFirst({
      where: {
        workspaceId,
        moduleType: "social-media-manager",
      },
      select: { id: true, config: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "social-media-manager module not installed for this workspace" },
        { status: 404 }
      );
    }

    const currentConfig = (existing.config ?? {}) as Record<string, unknown>;
    const newConfig = { ...currentConfig, ...body };

    const updated = await prisma.moduleInstallation.update({
      where: { id: existing.id },
      data: { config: newConfig as Record<string, string | number | boolean | null> },
      select: { id: true, config: true, updatedAt: true },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[fanpage/config] PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
