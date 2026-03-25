/**
 * Until full multi-org auth exists, dashboard + internal API default to this org.
 * Must match `x-organization-id` sent from the browser client.
 *
 * Note: use `??` alone is not enough — an empty env string ("") would otherwise
 * make server components query `organizationId: ""` and render empty lists, while
 * API routes still fall back via `header || "org-1"`.
 */
const raw = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
export const DEFAULT_ORGANIZATION_ID =
  typeof raw === "string" && raw.trim() !== "" ? raw.trim() : "org-1";
