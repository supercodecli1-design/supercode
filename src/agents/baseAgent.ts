// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Base Agent Class
// ═══════════════════════════════════════════════════════════════════════════════

import { v4 as uuidv4 } from 'uuid';
import type { AgentStatus, AgentMetrics, BaseAgentConfig, AgentMessage } from '../types/index.js';
import { eventBus } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

export abstract class BaseAgent {
  readonly id: string;
  readonly name: string;
  protected status: AgentStatus = 'idle';
  protected config: BaseAgentConfig;
  protected metrics: AgentMetrics;
  protected startTime?: Date;

  constructor(config: Partial<BaseAgentConfig> & { name: string }) {
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.config = {
      id: this.id,
      name: this.name,
      enabled: config.enabled ?? true,
      priority: config.priority ?? 5,
      maxConcurrency: config.maxConcurrency ?? 1,
    };
    this.metrics = {
      tasksCompleted: 0,
      tasksInProgress: 0,
      errorCount: 0,
      lastActivity: new Date(),
      uptime: 0,
    };

    // Listen for messages directed to this agent
    eventBus.onMessage(this.id, this.handleMessage.bind(this));
  }

  // Abstract methods to be implemented by subclasses
  abstract initialize(): Promise<void>;
  abstract shutdown(): Promise<void>;
  protected abstract processTask(task: unknown): Promise<unknown>;

  // Start the agent
  async start(): Promise<void> {
    if (this.status === 'running') {
      logger.warn(this.name, 'Agent is already running');
      return;
    }

    try {
      logger.info(this.name, `Starting agent...`);
      this.status = 'running';
      this.startTime = new Date();
      await this.initialize();
      eventBus.emitEvent({ type: 'agent:started', agentId: this.id });
      logger.info(this.name, `Agent started successfully`);
    } catch (error) {
      this.status = 'error';
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(this.name, `Failed to start agent: ${errorMsg}`);
      eventBus.emitEvent({ type: 'agent:error', agentId: this.id, error: errorMsg });
      throw error;
    }
  }

  // Stop the agent
  async stop(): Promise<void> {
    if (this.status === 'stopped') {
      logger.warn(this.name, 'Agent is already stopped');
      return;
    }

    try {
      logger.info(this.name, `Stopping agent...`);
      await this.shutdown();
      this.status = 'stopped';
      eventBus.emitEvent({ type: 'agent:stopped', agentId: this.id });
      logger.info(this.name, `Agent stopped successfully`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(this.name, `Error stopping agent: ${errorMsg}`);
    }
  }

  // Handle incoming messages
  protected async handleMessage(message: AgentMessage): Promise<void> {
    logger.debug(this.name, `Received message from ${message.from}`, message);
    
    if (message.type === 'request') {
      try {
        const result = await this.processTask(message.content);
        this.sendResponse(message.from, message.id, result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.sendError(message.from, message.id, errorMsg);
      }
    }
  }

  // Send a response message
  protected sendResponse(to: string, requestId: string, content: unknown): void {
    const response: AgentMessage = {
      id: uuidv4(),
      from: this.id,
      to,
      type: 'response',
      content: { requestId, data: content },
      timestamp: new Date(),
    };
    eventBus.sendMessage(response);
  }

  // Send an error message
  protected sendError(to: string, requestId: string, error: string): void {
    const response: AgentMessage = {
      id: uuidv4(),
      from: this.id,
      to,
      type: 'error',
      content: { requestId, error },
      timestamp: new Date(),
    };
    eventBus.sendMessage(response);
  }

  // Send a request to another agent
  protected async sendRequest(to: string, content: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = uuidv4();
      const timeout = setTimeout(() => {
        reject(new Error(`Request to ${to} timed out`));
      }, 30000);

      const handler = (message: AgentMessage) => {
        const payload = message.content as { requestId: string; data?: unknown; error?: string };
        if (payload.requestId === requestId) {
          clearTimeout(timeout);
          eventBus.off(`message:${this.id}`, handler);
          if (message.type === 'error') {
            reject(new Error(payload.error));
          } else {
            resolve(payload.data);
          }
        }
      };

      eventBus.on(`message:${this.id}`, handler);

      const request: AgentMessage = {
        id: requestId,
        from: this.id,
        to,
        type: 'request',
        content,
        timestamp: new Date(),
      };
      eventBus.sendMessage(request);
    });
  }

  // Emit an event
  protected emitEvent(type: string, payload: unknown): void {
    eventBus.emit(type, { source: this.id, payload, timestamp: new Date() });
  }

  // Get agent status
  getStatus(): AgentStatus {
    return this.status;
  }

  // Get agent metrics
  getMetrics(): AgentMetrics {
    if (this.startTime) {
      this.metrics.uptime = Date.now() - this.startTime.getTime();
    }
    return { ...this.metrics };
  }

  // Get agent config
  getConfig(): BaseAgentConfig {
    return { ...this.config };
  }

  // Update metrics
  protected updateMetrics(update: Partial<AgentMetrics>): void {
    Object.assign(this.metrics, update);
    this.metrics.lastActivity = new Date();
  }

  // Increment task counters
  protected taskStarted(): void {
    this.metrics.tasksInProgress++;
    this.metrics.lastActivity = new Date();
  }

  protected taskCompleted(): void {
    this.metrics.tasksInProgress--;
    this.metrics.tasksCompleted++;
    this.metrics.lastActivity = new Date();
  }

  protected taskFailed(): void {
    this.metrics.tasksInProgress--;
    this.metrics.errorCount++;
    this.metrics.lastActivity = new Date();
  }

  // Check if agent is enabled
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Enable/disable agent
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    logger.info(this.name, `Agent ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export default BaseAgent;
