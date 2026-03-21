// ─── Enums ───────────────────────────────────────────────────────────────────

export enum WorkspaceType {
  HQ = "HQ",
  CLIENT = "CLIENT",
  INTERNAL = "INTERNAL",
}

export enum UserRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  MEMBER = "MEMBER",
  VIEWER = "VIEWER",
}

export enum AgentStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  IDLE = "IDLE",
  BUSY = "BUSY",
  PAUSED = "PAUSED",
  ERROR = "ERROR",
}

export enum Visibility {
  PRIVATE = "PRIVATE",
  WORKSPACE = "WORKSPACE",
  GLOBAL = "GLOBAL",
}

export enum ProjectStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export enum TaskStatus {
  BACKLOG = "BACKLOG",
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  BLOCKED = "BLOCKED",
  AWAITING_APPROVAL = "AWAITING_APPROVAL",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export enum TaskPriority {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export enum TaskRunStatus {
  STARTED = "STARTED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  DENIED = "DENIED",
  EXPIRED = "EXPIRED",
}

export enum Severity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum MemoryType {
  NOTE = "NOTE",
  CONTEXT = "CONTEXT",
  FACT = "FACT",
  PREFERENCE = "PREFERENCE",
  INSTRUCTION = "INSTRUCTION",
}

export enum ArtifactType {
  DOCUMENT = "DOCUMENT",
  IMAGE = "IMAGE",
  SPREADSHEET = "SPREADSHEET",
  REPORT = "REPORT",
  DRAFT = "DRAFT",
  CODE = "CODE",
  OTHER = "OTHER",
}

export enum IntegrationType {
  GOOGLE_DRIVE = "GOOGLE_DRIVE",
  GOOGLE_SHEETS = "GOOGLE_SHEETS",
  META_FACEBOOK = "META_FACEBOOK",
  STRIPE = "STRIPE",
  WEBHOOK = "WEBHOOK",
  CUSTOM = "CUSTOM",
}

export enum IntegrationStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ERROR = "ERROR",
}

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL",
}

export enum ListingStatus {
  NEW = "NEW",
  INTAKE = "INTAKE",
  MEDIA_READY = "MEDIA_READY",
  CONTENT_DRAFTING = "CONTENT_DRAFTING",
  REVIEW = "REVIEW",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export enum MediaAssetType {
  DRONE = "DRONE",
  FRONT_EXTERIOR = "FRONT_EXTERIOR",
  INTERIOR = "INTERIOR",
  BACK_EXTERIOR = "BACK_EXTERIOR",
  VIDEO = "VIDEO",
  FLOOR_PLAN = "FLOOR_PLAN",
  OTHER = "OTHER",
}

export enum PostDraftStatus {
  DRAFT = "DRAFT",
  REVIEW = "REVIEW",
  APPROVED = "APPROVED",
  SCHEDULED = "SCHEDULED",
  PUBLISHED = "PUBLISHED",
  FAILED = "FAILED",
}

export enum PostPlatform {
  FACEBOOK_PAGE = "FACEBOOK_PAGE",
  FACEBOOK_GROUP = "FACEBOOK_GROUP",
  INSTAGRAM = "INSTAGRAM",
  TIKTOK = "TIKTOK",
  OTHER = "OTHER",
}

export enum ShareTaskStatus {
  PENDING = "PENDING",
  SHARED = "SHARED",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

export enum ModuleStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  plan?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  type: WorkspaceType;
  description?: string;
  iconUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  workspaceIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  organizationId: string;
  workspaceId?: string;
  departmentId?: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  status: AgentStatus;
  model: string;
  provider: string;
  systemPrompt?: string;
  visibility: Visibility;
  capabilities: string[];
  tags: string[];
  createdById: string;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentPermission {
  id: string;
  agentId: string;
  workspaceId: string;
  canRead: boolean;
  canWrite: boolean;
  canExecute: boolean;
  canApprove: boolean;
  grantedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  ownerId: string;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  workspaceId: string;
  projectId?: string;
  agentId?: string;
  assignedToUserId?: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  estimatedTokens?: number;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: Date;
}

export interface TaskRun {
  id: string;
  taskId: string;
  agentId: string;
  status: TaskRunStatus;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  durationMs?: number;
  errorMessage?: string;
  resultSummary?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface Approval {
  id: string;
  taskId: string;
  requestedById: string;
  reviewerId?: string;
  status: ApprovalStatus;
  reason?: string;
  reviewNote?: string;
  expiresAt?: Date;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface LogEvent {
  id: string;
  organizationId: string;
  workspaceId?: string;
  agentId?: string;
  taskId?: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  severity: Severity;
  isRead: boolean;
  linkUrl?: string;
  createdAt: Date;
}

export interface MemoryEntry {
  id: string;
  organizationId: string;
  workspaceId?: string;
  agentId?: string;
  type: MemoryType;
  title: string;
  content: string;
  tags: string[];
  visibility: Visibility;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SOPDocument {
  id: string;
  organizationId: string;
  workspaceId?: string;
  title: string;
  content: string;
  version: number;
  visibility: Visibility;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptTemplate {
  id: string;
  organizationId: string;
  workspaceId?: string;
  name: string;
  description?: string;
  template: string;
  variables: string[];
  visibility: Visibility;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Artifact {
  id: string;
  taskId?: string;
  agentId?: string;
  workspaceId: string;
  type: ArtifactType;
  name: string;
  url?: string;
  content?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: Date;
}

export interface Integration {
  id: string;
  organizationId: string;
  workspaceId?: string;
  type: IntegrationType;
  name: string;
  status: IntegrationStatus;
  config?: Record<string, unknown>;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CostRecord {
  id: string;
  organizationId: string;
  workspaceId?: string;
  agentId?: string;
  taskRunId?: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  recordedAt: Date;
}

export interface AgentHeartbeat {
  id: string;
  agentId: string;
  status: AgentStatus;
  cpuPercent?: number;
  memoryMb?: number;
  activeTaskId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface Comment {
  id: string;
  taskId: string;
  userId?: string;
  agentId?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModuleInstallation {
  id: string;
  workspaceId: string;
  moduleSlug: string;
  moduleName: string;
  version: string;
  status: ModuleStatus;
  config?: Record<string, unknown>;
  installedById: string;
  installedAt: Date;
  updatedAt: Date;
}

export interface Listing {
  id: string;
  workspaceId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  mlsNumber?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  status: ListingStatus;
  agentId?: string;
  assignedToUserId?: string;
  description?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaAsset {
  id: string;
  listingId: string;
  type: MediaAssetType;
  url: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  sortOrder: number;
  createdAt: Date;
}

export interface PostDraft {
  id: string;
  workspaceId: string;
  listingId?: string;
  platform: PostPlatform;
  status: PostDraftStatus;
  caption: string;
  mediaUrls: string[];
  hashtags: string[];
  scheduledAt?: Date;
  createdByAgentId?: string;
  reviewedByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishedPost {
  id: string;
  postDraftId: string;
  platform: PostPlatform;
  platformPostId?: string;
  publishedAt: Date;
  url?: string;
  impressions?: number;
  engagements?: number;
}

export interface ShareTask {
  id: string;
  postDraftId: string;
  platform: PostPlatform;
  status: ShareTaskStatus;
  errorMessage?: string;
  sharedAt?: Date;
  createdAt: Date;
}

export interface InvoiceSnapshot {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: InvoiceStatus;
  issuedAt: Date;
  dueDate: Date;
  paidAt?: Date;
  stripePaymentId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationAccount {
  id: string;
  integrationId: string;
  workspaceId: string;
  accountLabel: string;
  externalAccountId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
