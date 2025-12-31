// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Tools Manager Agent
// Manage 100+ tools dynamically with hot reload & attach/detach
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { ToolDefinition, ToolResult, ToolParameter } from '../types/index.js';
import { eventBus } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class ToolsManagerAgent extends BaseAgent {
  private tools: Map<string, ToolDefinition> = new Map();
  private categories: Set<string> = new Set();
  private executionHistory: Array<{ toolId: string; params: unknown; result: ToolResult; timestamp: Date }> = [];

  constructor() {
    super({ name: 'ToolsManagerAgent', priority: 8 });
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '🔧 Initializing Tools Manager Agent');
    
    // Load built-in tools
    await this.loadBuiltInTools();
    
    logger.info(this.name, `Loaded ${this.tools.size} tools in ${this.categories.size} categories`);
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down Tools Manager Agent');
    this.tools.clear();
  }

  protected async processTask(task: unknown): Promise<unknown> {
    const { action, toolId, params } = task as { action: string; toolId?: string; params?: Record<string, unknown> };
    
    switch (action) {
      case 'execute':
        if (!toolId) throw new Error('Tool ID required');
        return this.executeTool(toolId, params || {});
      case 'list':
        return this.getTools();
      case 'attach':
        if (!toolId) throw new Error('Tool ID required');
        return this.attachTool(toolId);
      case 'detach':
        if (!toolId) throw new Error('Tool ID required');
        return this.detachTool(toolId);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // Load built-in tools
  private async loadBuiltInTools(): Promise<void> {
    // File System Tools
    this.registerTool({
      id: 'file-read',
      name: 'Read File',
      description: 'Read contents of a file',
      category: 'filesystem',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'path', type: 'string', description: 'File path', required: true },
        { name: 'encoding', type: 'string', description: 'File encoding', required: false, default: 'utf-8' },
      ],
      execute: async (params) => {
        const start = Date.now();
        try {
          const fs = await import('fs/promises');
          const content = await fs.readFile(params.path as string, params.encoding as BufferEncoding || 'utf-8');
          return { success: true, data: content, executionTime: Date.now() - start };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    this.registerTool({
      id: 'file-write',
      name: 'Write File',
      description: 'Write contents to a file',
      category: 'filesystem',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'path', type: 'string', description: 'File path', required: true },
        { name: 'content', type: 'string', description: 'Content to write', required: true },
      ],
      execute: async (params) => {
        const start = Date.now();
        try {
          const fs = await import('fs/promises');
          await fs.writeFile(params.path as string, params.content as string);
          return { success: true, data: { written: true }, executionTime: Date.now() - start };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    this.registerTool({
      id: 'file-list',
      name: 'List Directory',
      description: 'List files in a directory',
      category: 'filesystem',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'path', type: 'string', description: 'Directory path', required: true },
        { name: 'recursive', type: 'boolean', description: 'List recursively', required: false, default: false },
      ],
      execute: async (params) => {
        const start = Date.now();
        try {
          const fs = await import('fs/promises');
          const files = await fs.readdir(params.path as string, { withFileTypes: true });
          const result = files.map(f => ({ name: f.name, isDirectory: f.isDirectory() }));
          return { success: true, data: result, executionTime: Date.now() - start };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    // Shell Tools
    this.registerTool({
      id: 'shell-exec',
      name: 'Execute Shell Command',
      description: 'Execute a shell command',
      category: 'shell',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'command', type: 'string', description: 'Command to execute', required: true },
        { name: 'cwd', type: 'string', description: 'Working directory', required: false },
      ],
      execute: async (params) => {
        const start = Date.now();
        try {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          const { stdout, stderr } = await execAsync(params.command as string, { cwd: params.cwd as string });
          return { success: true, data: { stdout, stderr }, executionTime: Date.now() - start };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    // HTTP Tools
    this.registerTool({
      id: 'http-get',
      name: 'HTTP GET Request',
      description: 'Make an HTTP GET request',
      category: 'http',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'url', type: 'string', description: 'URL to fetch', required: true },
        { name: 'headers', type: 'object', description: 'Request headers', required: false },
      ],
      execute: async (params) => {
        const start = Date.now();
        try {
          const response = await fetch(params.url as string, {
            headers: params.headers as Record<string, string>,
          });
          const data = await response.text();
          return { success: true, data: { status: response.status, body: data }, executionTime: Date.now() - start };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    this.registerTool({
      id: 'http-post',
      name: 'HTTP POST Request',
      description: 'Make an HTTP POST request',
      category: 'http',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'url', type: 'string', description: 'URL to post to', required: true },
        { name: 'body', type: 'object', description: 'Request body', required: true },
        { name: 'headers', type: 'object', description: 'Request headers', required: false },
      ],
      execute: async (params) => {
        const start = Date.now();
        try {
          const response = await fetch(params.url as string, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(params.headers as Record<string, string>) },
            body: JSON.stringify(params.body),
          });
          const data = await response.text();
          return { success: true, data: { status: response.status, body: data }, executionTime: Date.now() - start };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    // JSON Tools
    this.registerTool({
      id: 'json-parse',
      name: 'Parse JSON',
      description: 'Parse a JSON string',
      category: 'data',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'json', type: 'string', description: 'JSON string to parse', required: true },
      ],
      execute: async (params) => {
        const start = Date.now();
        try {
          const data = JSON.parse(params.json as string);
          return { success: true, data, executionTime: Date.now() - start };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    this.registerTool({
      id: 'json-stringify',
      name: 'Stringify JSON',
      description: 'Convert object to JSON string',
      category: 'data',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'data', type: 'object', description: 'Data to stringify', required: true },
        { name: 'pretty', type: 'boolean', description: 'Pretty print', required: false, default: false },
      ],
      execute: async (params) => {
        const start = Date.now();
        try {
          const json = params.pretty 
            ? JSON.stringify(params.data, null, 2)
            : JSON.stringify(params.data);
          return { success: true, data: json, executionTime: Date.now() - start };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    // Search Tools
    this.registerTool({
      id: 'grep-search',
      name: 'Grep Search',
      description: 'Search for pattern in files',
      category: 'search',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'pattern', type: 'string', description: 'Search pattern', required: true },
        { name: 'path', type: 'string', description: 'Path to search', required: true },
        { name: 'recursive', type: 'boolean', description: 'Search recursively', required: false, default: true },
      ],
      execute: async (params) => {
        const start = Date.now();
        try {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          const flags = params.recursive ? '-rn' : '-n';
          const { stdout } = await execAsync(`grep ${flags} "${params.pattern}" ${params.path}`);
          return { success: true, data: stdout.split('\n').filter(Boolean), executionTime: Date.now() - start };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    // Git Tools
    this.registerTool({
      id: 'git-status',
      name: 'Git Status',
      description: 'Get git repository status',
      category: 'git',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'path', type: 'string', description: 'Repository path', required: false, default: '.' },
      ],
      execute: async (params) => {
        const start = Date.now();
        try {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          const { stdout } = await execAsync('git status --porcelain', { cwd: params.path as string });
          return { success: true, data: stdout.split('\n').filter(Boolean), executionTime: Date.now() - start };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    this.registerTool({
      id: 'git-diff',
      name: 'Git Diff',
      description: 'Get git diff',
      category: 'git',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'path', type: 'string', description: 'Repository path', required: false, default: '.' },
        { name: 'staged', type: 'boolean', description: 'Show staged changes', required: false, default: false },
      ],
      execute: async (params) => {
        const start = Date.now();
        try {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          const cmd = params.staged ? 'git diff --staged' : 'git diff';
          const { stdout } = await execAsync(cmd, { cwd: params.path as string });
          return { success: true, data: stdout, executionTime: Date.now() - start };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    // System Tools
    this.registerTool({
      id: 'system-info',
      name: 'System Info',
      description: 'Get system information',
      category: 'system',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [],
      execute: async () => {
        const start = Date.now();
        try {
          const os = await import('os');
          return {
            success: true,
            data: {
              platform: os.platform(),
              arch: os.arch(),
              cpus: os.cpus().length,
              totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + 'GB',
              freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + 'GB',
              hostname: os.hostname(),
              uptime: Math.round(os.uptime() / 3600) + ' hours',
            },
            executionTime: Date.now() - start,
          };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    // Date/Time Tools
    this.registerTool({
      id: 'datetime-now',
      name: 'Current DateTime',
      description: 'Get current date and time',
      category: 'datetime',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'format', type: 'string', description: 'Output format', required: false, default: 'iso' },
      ],
      execute: async (params) => {
        const start = Date.now();
        const now = new Date();
        let formatted: string;
        
        switch (params.format) {
          case 'unix':
            formatted = String(Math.floor(now.getTime() / 1000));
            break;
          case 'date':
            formatted = now.toDateString();
            break;
          case 'time':
            formatted = now.toTimeString();
            break;
          default:
            formatted = now.toISOString();
        }
        
        return { success: true, data: formatted, executionTime: Date.now() - start };
      },
    });

    // Crypto Tools
    this.registerTool({
      id: 'crypto-hash',
      name: 'Hash String',
      description: 'Generate hash of a string',
      category: 'crypto',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [
        { name: 'input', type: 'string', description: 'String to hash', required: true },
        { name: 'algorithm', type: 'string', description: 'Hash algorithm', required: false, default: 'sha256' },
      ],
      execute: async (params) => {
        const start = Date.now();
        try {
          const crypto = await import('crypto');
          const hash = crypto.createHash(params.algorithm as string || 'sha256')
            .update(params.input as string)
            .digest('hex');
          return { success: true, data: hash, executionTime: Date.now() - start };
        } catch (error) {
          return { success: false, error: String(error), executionTime: Date.now() - start };
        }
      },
    });

    this.registerTool({
      id: 'crypto-uuid',
      name: 'Generate UUID',
      description: 'Generate a UUID',
      category: 'crypto',
      version: '1.0.0',
      attached: true,
      enabled: true,
      parameters: [],
      execute: async () => {
        const start = Date.now();
        return { success: true, data: uuidv4(), executionTime: Date.now() - start };
      },
    });

    // Add more tool categories for demonstration
    const additionalCategories = ['text', 'math', 'encoding', 'validation', 'transform'];
    for (const category of additionalCategories) {
      this.categories.add(category);
    }
  }

  // Register a new tool
  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.id, tool);
    this.categories.add(tool.category);
    logger.debug(this.name, `Registered tool: ${tool.name} (${tool.category})`);
  }

  // Unregister a tool
  unregisterTool(toolId: string): boolean {
    const deleted = this.tools.delete(toolId);
    if (deleted) {
      logger.info(this.name, `Unregistered tool: ${toolId}`);
    }
    return deleted;
  }

  // Execute a tool
  async executeTool(toolId: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    
    if (!tool) {
      return { success: false, error: `Tool not found: ${toolId}`, executionTime: 0 };
    }
    
    if (!tool.attached || !tool.enabled) {
      return { success: false, error: `Tool not available: ${toolId}`, executionTime: 0 };
    }

    this.taskStarted();
    logger.debug(this.name, `Executing tool: ${tool.name}`, params);

    try {
      const result = await tool.execute(params);
      
      this.executionHistory.push({
        toolId,
        params,
        result,
        timestamp: new Date(),
      });

      eventBus.emitEvent({ type: 'tool:executed', toolId, result });
      
      if (result.success) {
        this.taskCompleted();
      } else {
        this.taskFailed();
      }

      return result;
    } catch (error) {
      this.taskFailed();
      const result: ToolResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0,
      };
      return result;
    }
  }

  // Attach a tool
  attachTool(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (tool) {
      tool.attached = true;
      logger.info(this.name, `Attached tool: ${tool.name}`);
      return true;
    }
    return false;
  }

  // Detach a tool
  detachTool(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (tool) {
      tool.attached = false;
      logger.info(this.name, `Detached tool: ${tool.name}`);
      return true;
    }
    return false;
  }

  // Enable a tool
  enableTool(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (tool) {
      tool.enabled = true;
      return true;
    }
    return false;
  }

  // Disable a tool
  disableTool(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (tool) {
      tool.enabled = false;
      return true;
    }
    return false;
  }

  // Get all tools
  getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  // Get attached tools
  getAttachedTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(t => t.attached);
  }

  // Get tools by category
  getToolsByCategory(category: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(t => t.category === category);
  }

  // Get all categories
  getCategories(): string[] {
    return Array.from(this.categories);
  }

  // Get tool by ID
  getTool(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  // Get execution history
  getExecutionHistory(limit?: number): typeof this.executionHistory {
    return limit ? this.executionHistory.slice(-limit) : [...this.executionHistory];
  }

  // Search tools
  searchTools(query: string): ToolDefinition[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tools.values()).filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.category.toLowerCase().includes(lowerQuery)
    );
  }
}

export default ToolsManagerAgent;
