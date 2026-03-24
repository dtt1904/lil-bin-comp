import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequest,
  jsonResponse,
  errorResponse,
} from "@/lib/api-auth";

const destructiveOpsEnabled = process.env.ALLOW_DESTRUCTIVE_DB_OPS === "true";

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (body.confirm !== true) {
    return errorResponse(
      "Must send { confirm: true } to reset database",
      400
    );
  }

  if (!destructiveOpsEnabled) {
    return errorResponse(
      "Destructive DB operations are disabled. Set ALLOW_DESTRUCTIVE_DB_OPS=true to enable /api/v1/system/seed.",
      403
    );
  }

  const destructiveHeader = req.headers.get("x-confirm-destructive");
  if (destructiveHeader !== "RESET_DB") {
    return errorResponse(
      "Missing safety header x-confirm-destructive: RESET_DB",
      400
    );
  }

  try {
    await prisma.$transaction([
      prisma.shareTask.deleteMany(),
      prisma.publishedPost.deleteMany(),
      prisma.postDraft.deleteMany(),
      prisma.mediaAsset.deleteMany(),
      prisma.invoiceSnapshot.deleteMany(),
      prisma.listing.deleteMany(),
      prisma.integrationAccount.deleteMany(),
      prisma.costRecord.deleteMany(),
      prisma.logEvent.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.agentHeartbeat.deleteMany(),
      prisma.comment.deleteMany(),
      prisma.approval.deleteMany(),
      prisma.taskRun.deleteMany(),
      prisma.taskDependency.deleteMany(),
      prisma.artifact.deleteMany(),
      prisma.task.deleteMany(),
      prisma.project.deleteMany(),
      prisma.moduleInstallation.deleteMany(),
      prisma.integration.deleteMany(),
      prisma.promptTemplate.deleteMany(),
      prisma.sOPDocument.deleteMany(),
      prisma.memoryEntry.deleteMany(),
      prisma.agentPermission.deleteMany(),
      prisma.agent.deleteMany(),
      prisma.user.deleteMany(),
      prisma.department.deleteMany(),
      prisma.workspace.deleteMany(),
      prisma.organization.deleteMany(),
    ]);

    return jsonResponse({
      success: true,
      message: "Database cleared. Run npm run db:seed to re-seed.",
    });
  } catch (err) {
    return errorResponse("Failed to reset database", 500, {
      message: (err as Error).message,
    });
  }
}
