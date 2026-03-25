import { prisma } from "@/lib/db";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/default-organization";

/**
 * Cached flag — once verified the org exists we skip the DB check for the
 * lifetime of the process (warm Vercel function / dev server).
 */
let verified = false;

/**
 * Ensure the default organization row exists.
 *
 * `prisma migrate deploy` applies schema only — it does NOT seed data.
 * So on a fresh production database the Organization table is empty and
 * every query scoped to DEFAULT_ORGANIZATION_ID returns nothing, while
 * every INSERT referencing it fails with a FK constraint (P2003).
 *
 * This function is cheap after the first call (in-memory flag) and safe
 * to call concurrently (upsert is idempotent).
 */
export async function ensureDefaultOrganization(): Promise<void> {
  if (verified) return;

  try {
    await prisma.organization.upsert({
      where: { id: DEFAULT_ORGANIZATION_ID },
      create: {
        id: DEFAULT_ORGANIZATION_ID,
        name: "Trung AI Ops",
        slug: "trung-ai-ops",
        description:
          "lil_Bin multi-client AI operations — workspace-first",
      },
      update: {},
      select: { id: true },
    });
    verified = true;
  } catch (err) {
    // Slug uniqueness collision — org exists under a different id.
    // Find it and keep going; the dashboard will still render.
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      verified = true;
      return;
    }
    console.error("[ensure-org] bootstrap failed:", err);
  }
}
