/**
 * Until full multi-org auth exists, dashboard + internal API default to this org.
 * Must match `x-organization-id` sent from the browser client.
 */
export const DEFAULT_ORGANIZATION_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? "org-1";
