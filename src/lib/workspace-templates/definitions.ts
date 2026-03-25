import type { WorkspaceTemplateDefinition, WorkspaceTemplateId } from "./types";

const CLIENT_CORE: WorkspaceTemplateDefinition = {
  id: "client_core",
  label: "Client core workspace",
  summary:
    "Operations, finance, marketing, and delivery teams for running the client company itself (not a fanpage silo).",
  suggestedType: "CLIENT",
  departments: [
    {
      name: "Operations",
      slug: "operations",
      description: "Day-to-day delivery, SLAs, and coordination",
    },
    {
      name: "Finance",
      slug: "finance",
      description: "Billing, invoicing, and cost control",
    },
    {
      name: "Marketing",
      slug: "marketing",
      description: "Brand, campaigns, and GTM",
    },
    {
      name: "Content",
      slug: "content",
      description: "Copy, creative, and long-form assets",
    },
    {
      name: "Automation Ops",
      slug: "automation-ops",
      description: "Workflows, integrations, and agent runbooks",
    },
  ],
  modules: [
    { moduleType: "real-estate-content" },
    { moduleType: "invoice-tracker" },
  ],
  agents: [
    {
      name: "Ops Coordinator",
      slugBase: "ops-coordinator",
      role: "Operations lead",
      description:
        "Triage work, align tasks across departments, and keep the client workspace on schedule.",
      departmentSlug: "operations",
      model: "gpt-4o",
      provider: "openai",
      systemPrompt:
        "You are the operations coordinator for {{workspaceName}}. You prioritize tasks, unblock agents, and keep stakeholders informed. Departments are internal teams only; never conflate them with other clients.",
    },
    {
      name: "Finance Analyst",
      slugBase: "finance-analyst",
      role: "Finance & invoicing",
      description: "Track invoices, AR aging, and cost anomalies for this workspace only.",
      departmentSlug: "finance",
      model: "gpt-4o",
      provider: "openai",
      systemPrompt:
        "You support finance operations for {{workspaceName}} only. Scope all numbers and actions to this workspace; do not assume data from other clients.",
    },
  ],
  starterProject: {
    name: "Client onboarding & baseline",
    slugBase: "onboarding-baseline",
    description: "Initial setup: modules, agents, and operating cadence for this client workspace.",
    departmentSlug: "operations",
  },
  starterTasks: [
    {
      title: "Confirm workspace scope and naming with client stakeholders",
      description:
        "Align on legal entity vs fanpage vs BU — each should be its own workspace if separate.",
      departmentSlug: "operations",
      priority: "HIGH",
    },
    {
      title: "Enable core modules and verify data isolation",
      departmentSlug: "automation-ops",
      priority: "MEDIUM",
    },
    {
      title: "Define department owners and handoffs",
      departmentSlug: "operations",
      priority: "MEDIUM",
    },
  ],
};

const FANPAGE_GROWTH: WorkspaceTemplateDefinition = {
  id: "fanpage_growth",
  label: "Fanpage / growth workspace",
  summary:
    "Social posting, community, analytics, and growth workflows — one workspace per page or growth lane.",
  suggestedType: "CLIENT",
  departments: [
    {
      name: "Posting",
      slug: "posting",
      description: "Content calendar, scheduling, and format QA",
    },
    {
      name: "Inbox & Community",
      slug: "inbox-community",
      description: "DMs, comments, and moderation",
    },
    {
      name: "Analytics",
      slug: "analytics",
      description: "Performance reporting and experiments",
    },
    {
      name: "Content",
      slug: "content",
      description: "Hooks, scripts, and creative variants",
    },
    {
      name: "Growth / Paid",
      slug: "growth-paid",
      description: "Ads, boosts, and partner collabs",
    },
  ],
  modules: [
    { moduleType: "social-media-manager" },
    { moduleType: "real-estate-content" },
  ],
  agents: [
    {
      name: "Community Voice",
      slugBase: "community-voice",
      role: "Community & inbox",
      description:
        "Draft on-brand replies and escalate sensitive threads for {{workspaceName}}.",
      departmentSlug: "inbox-community",
      model: "gpt-4o",
      provider: "openai",
      systemPrompt:
        "You handle community and inbox for the {{workspaceName}} workspace only. Stay on brand; never blend messaging with other clients or workspaces.",
    },
    {
      name: "Posting Lead",
      slugBase: "posting-lead",
      role: "Social posting",
      description: "Plan cadence, captions, and approvals for this fanpage workspace.",
      departmentSlug: "posting",
      model: "gpt-4o",
      provider: "openai",
      systemPrompt:
        "You own the posting calendar for {{workspaceName}}. Each client or fanpage is its own workspace — scope all ideas and assets here only.",
    },
  ],
  starterProject: {
    name: "90-day growth sprint",
    slugBase: "growth-sprint-90",
    description: "Cadence, experiments, and reporting for this workspace.",
    departmentSlug: "analytics",
  },
  starterTasks: [
    {
      title: "Audit channels and confirm this workspace maps to one fanpage/BU",
      departmentSlug: "posting",
      priority: "HIGH",
    },
    {
      title: "Set weekly content pillars and approval flow",
      departmentSlug: "posting",
      priority: "MEDIUM",
    },
    {
      title: "Define community escalation rules",
      departmentSlug: "inbox-community",
      priority: "MEDIUM",
    },
  ],
};

const BY_ID: Record<WorkspaceTemplateId, WorkspaceTemplateDefinition> = {
  client_core: CLIENT_CORE,
  fanpage_growth: FANPAGE_GROWTH,
};

export function getWorkspaceTemplate(
  id: string
): WorkspaceTemplateDefinition | null {
  if (id === "client_core" || id === "fanpage_growth") {
    return BY_ID[id];
  }
  return null;
}

export function listWorkspaceTemplateSummaries(): Pick<
  WorkspaceTemplateDefinition,
  "id" | "label" | "summary" | "suggestedType"
>[] {
  return [CLIENT_CORE, FANPAGE_GROWTH].map(
    ({ id, label, summary, suggestedType }) => ({
      id,
      label,
      summary,
      suggestedType,
    })
  );
}
