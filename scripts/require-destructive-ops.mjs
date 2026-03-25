#!/usr/bin/env node

const op = process.argv[2] || "destructive-operation";
const allow = process.env.ALLOW_DESTRUCTIVE_DB_OPS === "true";

if (!allow) {
  console.error(
    [
      `[blocked] ${op} is disabled by default to protect real data.`,
      "Set ALLOW_DESTRUCTIVE_DB_OPS=true only when you explicitly want destructive demo operations.",
      "In production, prisma/seed additionally requires ALLOW_PRODUCTION_SEED=true;",
      "the /api/v1/system/seed route requires ALLOW_PRODUCTION_RESET=true (and the usual headers).",
      "Example:",
      `  ALLOW_DESTRUCTIVE_DB_OPS=true npm run ${op}`,
    ].join("\n")
  );
  process.exit(1);
}

console.log(`[allow] ${op} is enabled (ALLOW_DESTRUCTIVE_DB_OPS=true).`);
