// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - MCP Server Manager
// Manage 50+ local MCP servers with start/stop/config/monitor
// ═══════════════════════════════════════════════════════════════════════════════

import { spawn, ChildProcess } from 'child_process';
import type { MCPServerConfig, MCPServerState, MCPServerStatus } from '../types/index.js';
import { eventBus } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class MCPManager {
  private servers: Map<string, MCPServerState> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private static instance: MCPManager;

  private constructor() {}

  static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  async initialize(): Promise<void> {
    logger.info('MCPManager', '🔧 Initializing MCP Server Manager');
    this.loadDefaultServers();
    logger.info('MCPManager', `Loaded ${this.servers.size} MCP server configurations`);
  }

  async shutdown(): Promise<void> {
    logger.info('MCPManager', 'Shutting down all MCP servers...');
    for (const [id] of this.servers) {
      await this.stopServer(id);
    }
  }

  private loadDefaultServers(): void {
    // File System MCP Server
    this.registerServer({
      id: 'mcp-filesystem',
      name: 'Filesystem Server',
      description: 'File system operations (read, write, list, search)',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/'],
      attached: true,
      autoStart: false,
    });

    // Git MCP Server
    this.registerServer({
      id: 'mcp-git',
      name: 'Git Server',
      description: 'Git repository operations',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-git'],
      attached: true,
      autoStart: false,
    });

    // GitHub MCP Server
    this.registerServer({
      id: 'mcp-github',
      name: 'GitHub Server',
      description: 'GitHub API integration',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN || '' },
      attached: true,
      autoStart: false,
    });

    // Brave Search MCP Server
    this.registerServer({
      id: 'mcp-brave-search',
      name: 'Brave Search Server',
      description: 'Web search via Brave Search API',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: { BRAVE_API_KEY: process.env.BRAVE_API_KEY || '' },
      attached: true,
      autoStart: false,
    });

    // Fetch MCP Server
    this.registerServer({
      id: 'mcp-fetch',
      name: 'Fetch Server',
      description: 'HTTP fetch operations',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-fetch'],
      attached: true,
      autoStart: false,
    });

    // Memory MCP Server
    this.registerServer({
      id: 'mcp-memory',
      name: 'Memory Server',
      description: 'Persistent memory storage',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      attached: true,
      autoStart: false,
    });

    // Puppeteer MCP Server
    this.registerServer({
      id: 'mcp-puppeteer',
      name: 'Puppeteer Server',
      description: 'Browser automation',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      attached: true,
      autoStart: false,
    });

    // Slack MCP Server
    this.registerServer({
      id: 'mcp-slack',
      name: 'Slack Server',
      description: 'Slack integration',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      env: { SLACK_TOKEN: process.env.SLACK_TOKEN || '' },
      attached: false,
      autoStart: false,
    });

    // PostgreSQL MCP Server
    this.registerServer({
      id: 'mcp-postgres',
      name: 'PostgreSQL Server',
      description: 'PostgreSQL database operations',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: { DATABASE_URL: process.env.DATABASE_URL || '' },
      attached: false,
      autoStart: false,
    });

    // SQLite MCP Server
    this.registerServer({
      id: 'mcp-sqlite',
      name: 'SQLite Server',
      description: 'SQLite database operations',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sqlite'],
      attached: true,
      autoStart: false,
    });

    // Sentry MCP Server
    this.registerServer({
      id: 'mcp-sentry',
      name: 'Sentry Server',
      description: 'Sentry error tracking',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sentry'],
      env: { SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN || '' },
      attached: false,
      autoStart: false,
    });

    // Sequential Thinking MCP Server
    this.registerServer({
      id: 'mcp-sequential-thinking',
      name: 'Sequential Thinking Server',
      description: 'Step-by-step reasoning',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      attached: true,
      autoStart: false,
    });

    // Time MCP Server
    this.registerServer({
      id: 'mcp-time',
      name: 'Time Server',
      description: 'Time and timezone operations',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-time'],
      attached: true,
      autoStart: false,
    });

    // Everything MCP Server
    this.registerServer({
      id: 'mcp-everything',
      name: 'Everything Server',
      description: 'Windows Everything search integration',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-everything'],
      attached: false,
      autoStart: false,
    });

    // Google Drive MCP Server
    this.registerServer({
      id: 'mcp-gdrive',
      name: 'Google Drive Server',
      description: 'Google Drive integration',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-gdrive'],
      attached: false,
      autoStart: false,
    });

    // Google Maps MCP Server
    this.registerServer({
      id: 'mcp-google-maps',
      name: 'Google Maps Server',
      description: 'Google Maps API integration',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-google-maps'],
      env: { GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '' },
      attached: false,
      autoStart: false,
    });

    // AWS KB Retrieval MCP Server
    this.registerServer({
      id: 'mcp-aws-kb',
      name: 'AWS Knowledge Base Server',
      description: 'AWS Bedrock Knowledge Base retrieval',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-aws-kb-retrieval'],
      attached: false,
      autoStart: false,
    });

    // EverArt MCP Server
    this.registerServer({
      id: 'mcp-everart',
      name: 'EverArt Server',
      description: 'AI image generation',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-everart'],
      attached: false,
      autoStart: false,
    });

    // Add more community MCP servers
    const communityServers = [
      { id: 'mcp-docker', name: 'Docker Server', desc: 'Docker container management' },
      { id: 'mcp-kubernetes', name: 'Kubernetes Server', desc: 'K8s cluster management' },
      { id: 'mcp-redis', name: 'Redis Server', desc: 'Redis cache operations' },
      { id: 'mcp-mongodb', name: 'MongoDB Server', desc: 'MongoDB operations' },
      { id: 'mcp-elasticsearch', name: 'Elasticsearch Server', desc: 'Search and analytics' },
      { id: 'mcp-notion', name: 'Notion Server', desc: 'Notion workspace integration' },
      { id: 'mcp-linear', name: 'Linear Server', desc: 'Linear issue tracking' },
      { id: 'mcp-jira', name: 'Jira Server', desc: 'Jira project management' },
      { id: 'mcp-confluence', name: 'Confluence Server', desc: 'Confluence wiki' },
      { id: 'mcp-discord', name: 'Discord Server', desc: 'Discord bot integration' },
      { id: 'mcp-telegram', name: 'Telegram Server', desc: 'Telegram bot integration' },
      { id: 'mcp-twitter', name: 'Twitter Server', desc: 'Twitter/X API' },
      { id: 'mcp-youtube', name: 'YouTube Server', desc: 'YouTube data API' },
      { id: 'mcp-spotify', name: 'Spotify Server', desc: 'Spotify API' },
      { id: 'mcp-openweather', name: 'OpenWeather Server', desc: 'Weather data' },
      { id: 'mcp-wolfram', name: 'Wolfram Alpha Server', desc: 'Computational knowledge' },
      { id: 'mcp-arxiv', name: 'ArXiv Server', desc: 'Academic paper search' },
      { id: 'mcp-wikipedia', name: 'Wikipedia Server', desc: 'Wikipedia search' },
      { id: 'mcp-hackernews', name: 'Hacker News Server', desc: 'HN stories and comments' },
      { id: 'mcp-reddit', name: 'Reddit Server', desc: 'Reddit API' },
      { id: 'mcp-stripe', name: 'Stripe Server', desc: 'Payment processing' },
      { id: 'mcp-twilio', name: 'Twilio Server', desc: 'SMS and voice' },
      { id: 'mcp-sendgrid', name: 'SendGrid Server', desc: 'Email delivery' },
      { id: 'mcp-cloudflare', name: 'Cloudflare Server', desc: 'CDN and DNS' },
      { id: 'mcp-vercel', name: 'Vercel Server', desc: 'Deployment platform' },
      { id: 'mcp-netlify', name: 'Netlify Server', desc: 'JAMstack deployment' },
      { id: 'mcp-supabase', name: 'Supabase Server', desc: 'Backend as a service' },
      { id: 'mcp-firebase', name: 'Firebase Server', desc: 'Google Firebase' },
      { id: 'mcp-planetscale', name: 'PlanetScale Server', desc: 'Serverless MySQL' },
      { id: 'mcp-neon', name: 'Neon Server', desc: 'Serverless Postgres' },
    ];

    for (const server of communityServers) {
      this.registerServer({
        id: server.id,
        name: server.name,
        description: server.desc,
        command: 'npx',
        args: ['-y', `@modelcontextprotocol/${server.id.replace('mcp-', 'server-')}`],
        attached: false,
        autoStart: false,
      });
    }
  }

  // Register a new MCP server
  registerServer(config: MCPServerConfig): void {
    const state: MCPServerState = {
      config,
      status: 'stopped',
      metrics: {
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
      },
    };
    this.servers.set(config.id, state);
    logger.debug('MCPManager', `Registered MCP server: ${config.name}`);
  }

  // Unregister a server
  unregisterServer(id: string): boolean {
    this.stopServer(id);
    return this.servers.delete(id);
  }

  // Start a server
  async startServer(id: string): Promise<boolean> {
    const state = this.servers.get(id);
    if (!state) {
      logger.error('MCPManager', `Server not found: ${id}`);
      return false;
    }

    if (state.status === 'running') {
      logger.warn('MCPManager', `Server already running: ${id}`);
      return true;
    }

    try {
      state.status = 'starting';
      logger.info('MCPManager', `Starting MCP server: ${state.config.name}`);

      const childProcess = spawn(state.config.command, state.config.args, {
        env: { ...process.env, ...state.config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.processes.set(id, childProcess);

      childProcess.on('error', (error: Error) => {
        state.status = 'error';
        state.lastError = error.message;
        logger.error('MCPManager', `Server error: ${state.config.name}`, error);
      });

      childProcess.on('exit', (code: number | null) => {
        state.status = 'stopped';
        this.processes.delete(id);
        logger.info('MCPManager', `Server exited: ${state.config.name} (code: ${code})`);
      });

      childProcess.stdout?.on('data', (data: Buffer) => {
        logger.debug('MCPManager', `[${state.config.name}] ${data.toString().trim()}`);
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        logger.warn('MCPManager', `[${state.config.name}] ${data.toString().trim()}`);
      });

      // Wait a bit for the server to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      state.status = 'running';
      state.pid = childProcess.pid;
      state.startTime = new Date();

      eventBus.emitEvent({ type: 'mcp:started', serverId: id });
      logger.info('MCPManager', `Server started: ${state.config.name} (PID: ${childProcess.pid})`);
      
      return true;
    } catch (error) {
      state.status = 'error';
      state.lastError = error instanceof Error ? error.message : String(error);
      logger.error('MCPManager', `Failed to start server: ${state.config.name}`, error);
      return false;
    }
  }

  // Stop a server
  async stopServer(id: string): Promise<boolean> {
    const state = this.servers.get(id);
    const process = this.processes.get(id);

    if (!state || !process) {
      return false;
    }

    try {
      logger.info('MCPManager', `Stopping MCP server: ${state.config.name}`);
      process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!process.killed) {
        process.kill('SIGKILL');
      }

      state.status = 'stopped';
      state.pid = undefined;
      this.processes.delete(id);

      eventBus.emitEvent({ type: 'mcp:stopped', serverId: id });
      logger.info('MCPManager', `Server stopped: ${state.config.name}`);
      
      return true;
    } catch (error) {
      logger.error('MCPManager', `Failed to stop server: ${state.config.name}`, error);
      return false;
    }
  }

  // Restart a server
  async restartServer(id: string): Promise<boolean> {
    await this.stopServer(id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.startServer(id);
  }

  // Attach a server (enable it)
  attachServer(id: string): boolean {
    const state = this.servers.get(id);
    if (state) {
      state.config.attached = true;
      return true;
    }
    return false;
  }

  // Detach a server (disable it)
  detachServer(id: string): boolean {
    const state = this.servers.get(id);
    if (state) {
      state.config.attached = false;
      this.stopServer(id);
      return true;
    }
    return false;
  }

  // Get server state
  getServer(id: string): MCPServerState | undefined {
    return this.servers.get(id);
  }

  // Get all servers
  getServers(): MCPServerState[] {
    return Array.from(this.servers.values());
  }

  // Get attached servers
  getAttachedServers(): MCPServerState[] {
    return Array.from(this.servers.values()).filter(s => s.config.attached);
  }

  // Get running servers
  getRunningServers(): MCPServerState[] {
    return Array.from(this.servers.values()).filter(s => s.status === 'running');
  }

  // Start all attached servers with autoStart
  async startAutoStartServers(): Promise<void> {
    for (const [id, state] of this.servers) {
      if (state.config.attached && state.config.autoStart) {
        await this.startServer(id);
      }
    }
  }

  // Get server status summary
  getStatusSummary(): {
    total: number;
    attached: number;
    running: number;
    stopped: number;
    error: number;
  } {
    const servers = Array.from(this.servers.values());
    return {
      total: servers.length,
      attached: servers.filter(s => s.config.attached).length,
      running: servers.filter(s => s.status === 'running').length,
      stopped: servers.filter(s => s.status === 'stopped').length,
      error: servers.filter(s => s.status === 'error').length,
    };
  }

  // Update server metrics
  updateMetrics(id: string, requestTime: number, isError: boolean = false): void {
    const state = this.servers.get(id);
    if (!state) return;

    state.metrics.requestCount++;
    if (isError) {
      state.metrics.errorCount++;
    }

    // Update average response time
    const totalTime = state.metrics.avgResponseTime * (state.metrics.requestCount - 1) + requestTime;
    state.metrics.avgResponseTime = totalTime / state.metrics.requestCount;
  }
}

export const mcpManager = MCPManager.getInstance();
export default mcpManager;
