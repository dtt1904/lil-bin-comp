/** Cookie storing the operator's active workspace (client / BU scope). */
export const ACTIVE_WORKSPACE_COOKIE = "lilbin_active_workspace";

/** API header mirrored from the cookie for REST + SSE. */
export const ACTIVE_WORKSPACE_HEADER = "x-workspace-id";
