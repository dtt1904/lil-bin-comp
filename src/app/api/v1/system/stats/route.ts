import { NextRequest } from "next/server";
import { store } from "@/lib/store";
import { authenticateRequest, jsonResponse } from "@/lib/api-auth";
import {
  AgentStatus,
  ApprovalStatus,
  TaskStatus,
  LogLevel,
  PostDraftStatus,
  InvoiceStatus,
  ListingStatus,
} from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const activeAgents = store.filter(
    store.agents,
    (a) => a.status === AgentStatus.ONLINE || a.status === AgentStatus.BUSY
  ).length;

  const pendingApprovals = store.filter(
    store.approvals,
    (a) => a.status === ApprovalStatus.PENDING
  ).length;

  const recentErrors = store.filter(store.logEvents, (e) => {
    const ago = Date.now() - new Date(e.timestamp).getTime();
    return e.level === LogLevel.ERROR && ago < 24 * 60 * 60 * 1000;
  }).length;

  const runningTasks = store.filter(
    store.tasks,
    (t) => t.status === TaskStatus.RUNNING
  ).length;

  const draftsPendingReview = store.filter(
    store.postDrafts,
    (d) => d.status === PostDraftStatus.REVIEW
  ).length;

  const overdueInvoices = store.filter(store.invoiceSnapshots, (i) => {
    if (i.status === InvoiceStatus.OVERDUE) return true;
    return i.status === InvoiceStatus.SENT && new Date(i.dueDate) < new Date();
  }).length;

  const activeListings = store.filter(
    store.listings,
    (l) => l.status !== ListingStatus.ARCHIVED
  ).length;

  return jsonResponse({
    data: {
      entities: {
        organizations: 1,
        workspaces: store.workspaces.length,
        departments: store.departments.length,
        users: store.users.length,
        agents: store.agents.length,
        projects: store.projects.length,
        tasks: store.tasks.length,
        listings: store.listings.length,
        mediaAssets: store.mediaAssets.length,
        postDrafts: store.postDrafts.length,
        publishedPosts: store.publishedPosts.length,
        shareTasks: store.shareTasks.length,
        invoices: store.invoiceSnapshots.length,
        logEvents: store.logEvents.length,
      },
      activity: {
        activeAgents,
        runningTasks,
        pendingApprovals,
        draftsPendingReview,
        overdueInvoices,
        activeListings,
        recentErrors,
      },
    },
  });
}
