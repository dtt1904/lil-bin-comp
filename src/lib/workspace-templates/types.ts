export type WorkspaceTemplateId = "client_core" | "fanpage_growth";

export interface TemplateDepartment {
  name: string;
  slug: string;
  description?: string;
}

export interface TemplateModule {
  moduleType: string;
}

export interface TemplateAgent {
  name: string;
  /** Base slug fragment; final slug is prefixed with workspace slug for org-wide uniqueness */
  slugBase: string;
  role: string;
  description: string;
  departmentSlug?: string;
  model: string;
  provider: string;
  /** Use {{workspaceName}} for substitution */
  systemPrompt: string;
}

export interface TemplateStarterProject {
  name: string;
  slugBase: string;
  description?: string;
  departmentSlug?: string;
}

export interface TemplateStarterTask {
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  departmentSlug?: string;
}

export interface WorkspaceTemplateDefinition {
  id: WorkspaceTemplateId;
  label: string;
  summary: string;
  suggestedType: "CLIENT" | "INTERNAL" | "HQ";
  departments: TemplateDepartment[];
  modules: TemplateModule[];
  agents: TemplateAgent[];
  starterProject: TemplateStarterProject | null;
  starterTasks: TemplateStarterTask[];
}
