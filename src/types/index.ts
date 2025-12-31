// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Agent Types
// ─────────────────────────────────────────────────────────────────────────────

export type AgentStatus = 'idle' | 'running' | 'error' | 'stopped';

export interface AgentMetrics {
  tasksCompleted: number;
  tasksInProgress: number;
  errorCount: number;
  lastActivity: Date;
  uptime: number;
}

export interface BaseAgentConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  maxConcurrency: number;
}

export interface AgentEvent {
  type: string;
  source: string;
  target?: string;
  payload: unknown;
  timestamp: Date;
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'event' | 'error';
  content: unknown;
  timestamp: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Types
// ─────────────────────────────────────────────────────────────────────────────

export type ModelProvider = 'ollama' | 'lmstudio' | 'gguf' | 'llamacpp' | 'openai' | 'anthropic';
export type ModelSize = 'small' | 'medium' | 'large';
export type ModelCapability = 'chat' | 'code' | 'embedding' | 'vision' | 'reasoning';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  size: ModelSize;
  vramRequired: number; // in MB
  capabilities: ModelCapability[];
  endpoint?: string;
  apiKey?: string;
  contextLength: number;
  temperature: number;
  attached: boolean;
  personalization?: ModelPersonalization;
}

export interface ModelPersonalization {
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface ModelRouteRequest {
  task: string;
  requiredCapabilities: ModelCapability[];
  preferredSize?: ModelSize;
  maxVram?: number;
  priority?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  attached: boolean;
  enabled: boolean;
  parameters: ToolParameter[];
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Function Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FunctionDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  attached: boolean;
  enabled: boolean;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
  execute: (input: unknown) => Promise<unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Types
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'tool' | 'function' | 'agent' | 'condition' | 'loop';
  config: Record<string, unknown>;
  next?: string | string[];
  condition?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  attached: boolean;
  enabled: boolean;
  steps: WorkflowStep[];
  triggers?: WorkflowTrigger[];
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'event' | 'webhook';
  config: Record<string, unknown>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  currentStep?: string;
  startTime: Date;
  endTime?: Date;
  context: Record<string, unknown>;
  results: Record<string, unknown>;
  errors: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP Types
// ─────────────────────────────────────────────────────────────────────────────

export type MCPServerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  port?: number;
  attached: boolean;
  autoStart: boolean;
}

export interface MCPServerState {
  config: MCPServerConfig;
  status: MCPServerStatus;
  pid?: number;
  startTime?: Date;
  lastError?: string;
  metrics: {
    requestCount: number;
    errorCount: number;
    avgResponseTime: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  agentId: string;
  type: 'short_term' | 'long_term' | 'episodic' | 'semantic';
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface MemoryQuery {
  agentId?: string;
  type?: MemoryEntry['type'];
  query?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Base Types
// ─────────────────────────────────────────────────────────────────────────────

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'code' | 'markdown' | 'json' | 'yaml';
  source: string;
  version: number;
  tags: string[];
  embedding?: number[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeQuery {
  query: string;
  type?: KnowledgeDocument['type'];
  tags?: string[];
  limit?: number;
  threshold?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Types
// ─────────────────────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface ChatSession {
  id: string;
  name: string;
  modelId?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Todo/Planner Types
// ─────────────────────────────────────────────────────────────────────────────

export type TodoPriority = 'low' | 'medium' | 'high' | 'critical';
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  priority: TodoPriority;
  status: TodoStatus;
  tags: string[];
  files?: string[];
  dueDate?: Date;
  reminder?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  parentId?: string;
  subtasks?: string[];
}

export interface PlannerTask {
  id: string;
  name: string;
  type: 'code' | 'review' | 'test' | 'deploy' | 'document' | 'other';
  files: string[];
  dependencies: string[];
  estimatedTime?: number;
  actualTime?: number;
  status: TodoStatus;
  priority: TodoPriority;
}

// ─────────────────────────────────────────────────────────────────────────────
// Observability Types
// ─────────────────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  id: string;
  level: LogLevel;
  source: string;
  message: string;
  data?: unknown;
  timestamp: Date;
  traceId?: string;
}

export interface MetricEntry {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram';
  labels: Record<string, string>;
  timestamp: Date;
}

export interface ErrorEvent {
  id: string;
  source: string;
  error: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: Date;
  resolved: boolean;
  retryCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GlobalSettings {
  theme: 'dark' | 'light' | 'high-contrast' | 'toon';
  language: string;
  autoSave: boolean;
  hotReload: boolean;
  maxVram: number;
  defaultModel?: string;
  logLevel: LogLevel;
  notifications: boolean;
  shortcuts: Record<string, string>;
}

export interface AgentSettings {
  agentId: string;
  enabled: boolean;
  priority: number;
  maxConcurrency: number;
  timeout: number;
  retryCount: number;
  customConfig: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SecretEntry {
  id: string;
  name: string;
  type: 'api_key' | 'token' | 'password' | 'certificate';
  encryptedValue: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
}

export interface Permission {
  agentId: string;
  resource: string;
  actions: ('read' | 'write' | 'execute' | 'delete')[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TUI Types
// ─────────────────────────────────────────────────────────────────────────────

export type MenuCommand = 
  | '/model' | '/chat' | '/tools' | '/functions' | '/workflows'
  | '/mcp' | '/agent' | '/memory' | '/knowledge' | '/planner'
  | '/export' | '/import' | '/settings' | '/themes' | '/debug'
  | '/help' | '/notifications' | '/updates' | '/integration'
  | '/shortcuts' | '/security' | '/quit';

export interface MenuItem {
  command: MenuCommand;
  label: string;
  description: string;
  icon: string;
  shortcut?: string;
  subItems?: MenuItem[];
}

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    border: string;
  };
  styles: {
    boxStyle: 'single' | 'double' | 'round' | 'bold';
    headerStyle: 'banner' | 'simple' | 'gradient';
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExternalIntegration {
  id: string;
  name: string;
  type: 'llm' | 'api' | 'database' | 'webhook';
  config: Record<string, unknown>;
  enabled: boolean;
  healthCheck?: () => Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

export type SuperCodeEvent =
  | { type: 'agent:started'; agentId: string }
  | { type: 'agent:stopped'; agentId: string }
  | { type: 'agent:error'; agentId: string; error: string }
  | { type: 'model:attached'; modelId: string }
  | { type: 'model:detached'; modelId: string }
  | { type: 'tool:executed'; toolId: string; result: ToolResult }
  | { type: 'workflow:started'; workflowId: string; executionId: string }
  | { type: 'workflow:completed'; workflowId: string; executionId: string }
  | { type: 'workflow:failed'; workflowId: string; executionId: string; error: string }
  | { type: 'mcp:started'; serverId: string }
  | { type: 'mcp:stopped'; serverId: string }
  | { type: 'memory:updated'; entryId: string }
  | { type: 'chat:message'; sessionId: string; messageId: string }
  | { type: 'notification'; title: string; message: string; level: LogLevel };
