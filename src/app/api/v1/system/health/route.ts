import { jsonResponse } from "@/lib/api-auth";
import { store } from "@/lib/store";

const startTime = Date.now();

export async function GET() {
  return jsonResponse({
    status: "ok",
    version: "1.0.0",
    uptime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    counts: {
      workspaces: store.workspaces.length,
      departments: store.departments.length,
      agents: store.agents.length,
      tasks: store.tasks.length,
      projects: store.projects.length,
      listings: store.listings.length,
      mediaAssets: store.mediaAssets.length,
      postDrafts: store.postDrafts.length,
      publishedPosts: store.publishedPosts.length,
      shareTasks: store.shareTasks.length,
      invoices: store.invoiceSnapshots.length,
      users: store.users.length,
    },
  });
}
