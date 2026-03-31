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

const NAIL_SALON: WorkspaceTemplateDefinition = {
  id: "nail_salon",
  label: "Nail salon workspace",
  summary:
    "Full operations for a nail salon location — front desk, technicians, marketing, finance, inventory, and compliance. One workspace per location.",
  suggestedType: "CLIENT",
  departments: [
    {
      name: "Front Desk",
      slug: "front-desk",
      description:
        "Booking, walk-in queue, check-in/check-out, and customer experience",
    },
    {
      name: "Technicians",
      slug: "technicians",
      description:
        "Staff scheduling, shift management, commission tracking, and performance",
    },
    {
      name: "Marketing",
      slug: "marketing",
      description:
        "Social media, Google reviews, promotions, and local SEO",
    },
    {
      name: "Finance",
      slug: "finance",
      description:
        "Daily revenue, payroll/commission calculation, expenses, and reporting",
    },
    {
      name: "Inventory",
      slug: "inventory",
      description:
        "Nail supplies, gel, polish, consumables tracking and reorder alerts",
    },
    {
      name: "Compliance",
      slug: "compliance",
      description:
        "Cosmetology licenses, health inspections, I-9 documentation, and regulatory reminders",
    },
  ],
  modules: [
    { moduleType: "social-media-manager" },
    { moduleType: "invoice-tracker" },
  ],
  agents: [
    {
      name: "Salon Manager",
      slugBase: "salon-manager",
      role: "Salon operations lead",
      description:
        "The primary AI agent for this salon. Coordinates across all departments, handles owner requests, monitors KPIs, and escalates issues to the supervisor.",
      departmentSlug: "front-desk",
      model: "gpt-4o",
      provider: "openai",
      systemPrompt:
        "You are the AI salon manager for {{workspaceName}}. You manage daily operations including scheduling, staff coordination, customer flow, and reporting. You ONLY have access to this salon's data — never reference or access other salons or workspaces. When the salon owner asks you something, answer using only this salon's data. If a request exceeds your authority, escalate to the supervisor.",
    },
    {
      name: "Marketing Agent",
      slugBase: "marketing-agent",
      role: "Marketing & reviews",
      description:
        "Handles social media posting, Google review requests, promotional content, and local SEO for this salon only.",
      departmentSlug: "marketing",
      model: "gpt-4o",
      provider: "openai",
      systemPrompt:
        "You handle marketing for {{workspaceName}} nail salon. Your tasks: post nail art photos to social media, request Google reviews from customers 2-4 hours after their visit, draft promotional content for seasonal specials, and monitor online reputation. Stay on brand for this specific salon — do not mix content with other locations.",
    },
    {
      name: "Finance Agent",
      slugBase: "finance-agent",
      role: "Revenue & payroll",
      description:
        "Tracks daily revenue, calculates technician commissions, monitors expenses, and generates financial reports for this salon.",
      departmentSlug: "finance",
      model: "gpt-4o",
      provider: "openai",
      systemPrompt:
        "You manage finances for {{workspaceName}}. Track daily revenue, calculate technician commissions by service type, monitor supply expenses, and generate daily/weekly/monthly summaries. All financial data is scoped to this salon only.",
    },
    {
      name: "Compliance Agent",
      slugBase: "compliance-agent",
      role: "Regulatory & licensing",
      description:
        "Monitors license renewals, health inspection schedules, I-9 compliance, and regulatory requirements for this salon location.",
      departmentSlug: "compliance",
      model: "gpt-4o",
      provider: "openai",
      systemPrompt:
        "You handle compliance for {{workspaceName}}. Track cosmetology license expiration dates, schedule health inspection reminders, maintain I-9 documentation awareness, and flag any regulatory concerns. Alert the salon manager and escalate to supervisor if deadlines are approaching.",
    },
  ],
  starterProject: {
    name: "Salon setup & onboarding",
    slugBase: "salon-onboarding",
    description:
      "Initial setup: service menu, staff profiles, integrations, and operating procedures for this salon location.",
    departmentSlug: "front-desk",
  },
  starterTasks: [
    {
      title: "Setup service menu and pricing",
      description:
        "Define all nail services offered (manicure, pedicure, gel, acrylic, dip, nail art, waxing, etc.) with pricing tiers.",
      departmentSlug: "front-desk",
      priority: "HIGH",
    },
    {
      title: "Configure technician profiles and commission rates",
      description:
        "Add each technician with their specialties, commission percentage per service type, and shift schedule.",
      departmentSlug: "technicians",
      priority: "HIGH",
    },
    {
      title: "Connect Google Business Profile for review automation",
      description:
        "Link the salon's Google Business Profile to enable automated review requests and reputation monitoring.",
      departmentSlug: "marketing",
      priority: "HIGH",
    },
    {
      title: "Setup social media accounts for content posting",
      description:
        "Connect Facebook and Instagram pages for automated nail art showcase, promotions, and seasonal content.",
      departmentSlug: "marketing",
      priority: "MEDIUM",
    },
    {
      title: "Create initial inventory checklist",
      description:
        "List all nail supplies, gels, polishes, acrylics, and consumables with current stock levels and reorder thresholds.",
      departmentSlug: "inventory",
      priority: "MEDIUM",
    },
    {
      title: "Verify all licenses and set renewal reminders",
      description:
        "Confirm cosmetology licenses for all technicians, salon business license, and health permits. Set calendar reminders for renewals.",
      departmentSlug: "compliance",
      priority: "MEDIUM",
    },
    {
      title: "Define daily closing report format",
      description:
        "Establish the daily report template: total revenue, services performed, walk-ins vs appointments, commission breakdown, and supply usage.",
      departmentSlug: "finance",
      priority: "LOW",
    },
  ],
};

const BY_ID: Record<WorkspaceTemplateId, WorkspaceTemplateDefinition> = {
  client_core: CLIENT_CORE,
  fanpage_growth: FANPAGE_GROWTH,
  nail_salon: NAIL_SALON,
};

export function getWorkspaceTemplate(
  id: string
): WorkspaceTemplateDefinition | null {
  if (id === "client_core" || id === "fanpage_growth" || id === "nail_salon") {
    return BY_ID[id];
  }
  return null;
}

export function listWorkspaceTemplateSummaries(): Pick<
  WorkspaceTemplateDefinition,
  "id" | "label" | "summary" | "suggestedType"
>[] {
  return [CLIENT_CORE, FANPAGE_GROWTH, NAIL_SALON].map(
    ({ id, label, summary, suggestedType }) => ({
      id,
      label,
      summary,
      suggestedType,
    })
  );
}
