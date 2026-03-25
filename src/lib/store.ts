/**
 * Legacy in-memory demo store (seeded from mock-data). Not imported by `src/app` API routes;
 * the app uses Prisma for persistence. Do not wire this back into production request paths.
 */
import * as mock from "./mock-data";
import type {
  Organization, Workspace, Department, User, Agent, AgentPermission,
  Project, Task, TaskDependency, TaskRun, Approval, LogEvent,
  Notification, MemoryEntry, SOPDocument, PromptTemplate, Artifact,
  Integration, CostRecord, AgentHeartbeat, Comment, ModuleInstallation,
  Listing, MediaAsset, PostDraft, PublishedPost, ShareTask,
  InvoiceSnapshot, IntegrationAccount,
} from "./types";

let counter = 1000;
export function generateId(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;
}

function deepClone<T>(arr: T[]): T[] {
  return arr.map((item) => ({ ...item }));
}

class DataStore {
  organization: Organization;
  workspaces: Workspace[];
  departments: Department[];
  users: User[];
  agents: Agent[];
  agentPermissions: AgentPermission[];
  projects: Project[];
  tasks: Task[];
  taskDependencies: TaskDependency[];
  taskRuns: TaskRun[];
  approvals: Approval[];
  logEvents: LogEvent[];
  notifications: Notification[];
  memoryEntries: MemoryEntry[];
  sopDocuments: SOPDocument[];
  promptTemplates: PromptTemplate[];
  artifacts: Artifact[];
  integrations: Integration[];
  costRecords: CostRecord[];
  agentHeartbeats: AgentHeartbeat[];
  comments: Comment[];
  moduleInstallations: ModuleInstallation[];
  listings: Listing[];
  mediaAssets: MediaAsset[];
  postDrafts: PostDraft[];
  publishedPosts: PublishedPost[];
  shareTasks: ShareTask[];
  invoiceSnapshots: InvoiceSnapshot[];
  integrationAccounts: IntegrationAccount[];

  constructor() {
    this.organization = { ...mock.organization };
    this.workspaces = deepClone(mock.workspaces);
    this.departments = deepClone(mock.departments);
    this.users = deepClone(mock.users);
    this.agents = deepClone(mock.agents);
    this.agentPermissions = deepClone(mock.agentPermissions);
    this.projects = deepClone(mock.projects);
    this.tasks = deepClone(mock.tasks);
    this.taskDependencies = deepClone(mock.taskDependencies);
    this.taskRuns = deepClone(mock.taskRuns);
    this.approvals = deepClone(mock.approvals);
    this.logEvents = deepClone(mock.logEvents);
    this.notifications = deepClone(mock.notifications);
    this.memoryEntries = deepClone(mock.memoryEntries);
    this.sopDocuments = deepClone(mock.sopDocuments);
    this.promptTemplates = deepClone(mock.promptTemplates);
    this.artifacts = deepClone(mock.artifacts);
    this.integrations = deepClone(mock.integrations);
    this.costRecords = deepClone(mock.costRecords);
    this.agentHeartbeats = deepClone(mock.agentHeartbeats);
    this.comments = deepClone(mock.comments);
    this.moduleInstallations = deepClone(mock.moduleInstallations);
    this.listings = deepClone(mock.listings);
    this.mediaAssets = deepClone(mock.mediaAssets);
    this.postDrafts = deepClone(mock.postDrafts);
    this.publishedPosts = deepClone(mock.publishedPosts);
    this.shareTasks = deepClone(mock.shareTasks);
    this.invoiceSnapshots = deepClone(mock.invoiceSnapshots);
    this.integrationAccounts = deepClone(mock.integrationAccounts);
  }

  findById<T extends { id: string }>(collection: T[], id: string): T | undefined {
    return collection.find((item) => item.id === id);
  }

  insert<T>(collection: T[], item: T): T {
    collection.push(item);
    return item;
  }

  update<T extends { id: string }>(
    collection: T[],
    id: string,
    updates: Partial<T>
  ): T | null {
    const idx = collection.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    collection[idx] = { ...collection[idx], ...updates };
    return collection[idx];
  }

  remove<T extends { id: string }>(collection: T[], id: string): boolean {
    const idx = collection.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    collection.splice(idx, 1);
    return true;
  }

  filter<T>(collection: T[], predicate: (item: T) => boolean): T[] {
    return collection.filter(predicate);
  }

  reset(): void {
    Object.assign(this, new DataStore());
  }
}

// Singleton — survives across API requests within the same server process
export const store = new DataStore();
