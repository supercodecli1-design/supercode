// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Supervisor Agent
// Orchestrates all sub-agents, routing, logging, error handling
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { AgentStatus, AgentMetrics } from '../types/index.js';
import { eventBus } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

interface SubAgentInfo {
  agent: BaseAgent;
  attached: boolean;
  priority: number;
}

export class SupervisorAgent extends BaseAgent {
  private subAgents: Map<string, SubAgentInfo> = new Map();
  private taskQueue: Array<{ task: unknown; agentId?: string; resolve: (v: unknown) => void; reject: (e: Error) => void }> = [];
  private isProcessing = false;

  constructor() {
    super({ name: 'SupervisorAgent', priority: 10 });
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '🎯 Initializing Supervisor Agent - Master Orchestrator');
    
    // Subscribe to all agent events
    eventBus.onEvent('agent:started', (event) => {
      logger.info(this.name, `Sub-agent started: ${event.agentId}`);
    });

    eventBus.onEvent('agent:stopped', (event) => {
      logger.info(this.name, `Sub-agent stopped: ${event.agentId}`);
    });

    eventBus.onEvent('agent:error', (event) => {
      logger.error(this.name, `Sub-agent error: ${event.agentId} - ${event.error}`);
      this.handleAgentError(event.agentId, event.error);
    });

    // Start processing task queue
    this.startTaskProcessor();
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down all sub-agents...');
    
    // Stop all sub-agents in reverse priority order
    const agents = Array.from(this.subAgents.values())
      .sort((a, b) => a.priority - b.priority);
    
    for (const { agent } of agents) {
      try {
        await agent.stop();
      } catch (error) {
        logger.error(this.name, `Error stopping ${agent.name}`, error);
      }
    }
    
    this.subAgents.clear();
    logger.info(this.name, 'All sub-agents stopped');
  }

  protected async processTask(task: unknown): Promise<unknown> {
    // Route task to appropriate sub-agent
    const taskObj = task as { type?: string; agentId?: string; data?: unknown };
    
    if (taskObj.agentId) {
      const agentInfo = this.subAgents.get(taskObj.agentId);
      if (agentInfo?.attached) {
        return this.sendRequest(taskObj.agentId, taskObj.data);
      }
      throw new Error(`Agent ${taskObj.agentId} not found or not attached`);
    }

    // Auto-route based on task type
    const targetAgent = this.routeTask(taskObj);
    if (targetAgent) {
      return this.sendRequest(targetAgent.agent.id, taskObj.data);
    }

    throw new Error('No suitable agent found for task');
  }

  // Register a sub-agent
  registerAgent(agent: BaseAgent, priority: number = 5): void {
    this.subAgents.set(agent.id, {
      agent,
      attached: true,
      priority,
    });
    logger.info(this.name, `Registered sub-agent: ${agent.name} (priority: ${priority})`);
  }

  // Unregister a sub-agent
  unregisterAgent(agentId: string): void {
    const info = this.subAgents.get(agentId);
    if (info) {
      this.subAgents.delete(agentId);
      logger.info(this.name, `Unregistered sub-agent: ${info.agent.name}`);
    }
  }

  // Attach a sub-agent (enable it)
  attachAgent(agentId: string): boolean {
    const info = this.subAgents.get(agentId);
    if (info) {
      info.attached = true;
      logger.info(this.name, `Attached sub-agent: ${info.agent.name}`);
      return true;
    }
    return false;
  }

  // Detach a sub-agent (disable it)
  detachAgent(agentId: string): boolean {
    const info = this.subAgents.get(agentId);
    if (info) {
      info.attached = false;
      logger.info(this.name, `Detached sub-agent: ${info.agent.name}`);
      return true;
    }
    return false;
  }

  // Start all registered sub-agents
  async startAllAgents(): Promise<void> {
    logger.info(this.name, '🚀 Starting all sub-agents...');
    
    // Start agents in priority order (highest first)
    const agents = Array.from(this.subAgents.values())
      .filter(a => a.attached)
      .sort((a, b) => b.priority - a.priority);
    
    for (const { agent } of agents) {
      try {
        await agent.start();
      } catch (error) {
        logger.error(this.name, `Failed to start ${agent.name}`, error);
      }
    }
    
    logger.info(this.name, `✅ Started ${agents.length} sub-agents`);
  }

  // Get all sub-agents status
  getAgentsStatus(): Array<{ id: string; name: string; status: AgentStatus; attached: boolean; metrics: AgentMetrics }> {
    return Array.from(this.subAgents.entries()).map(([id, info]) => ({
      id,
      name: info.agent.name,
      status: info.agent.getStatus(),
      attached: info.attached,
      metrics: info.agent.getMetrics(),
    }));
  }

  // Get a specific sub-agent
  getAgent(agentId: string): BaseAgent | undefined {
    return this.subAgents.get(agentId)?.agent;
  }

  // Get agent by name
  getAgentByName(name: string): BaseAgent | undefined {
    for (const info of this.subAgents.values()) {
      if (info.agent.name === name) {
        return info.agent;
      }
    }
    return undefined;
  }

  // Route task to appropriate agent
  private routeTask(task: { type?: string }): SubAgentInfo | undefined {
    const typeToAgent: Record<string, string> = {
      model: 'ModelRouterAgent',
      tool: 'ToolsManagerAgent',
      function: 'FunctionsAgent',
      memory: 'MemoryAgent',
      knowledge: 'KnowledgeAgent',
      workflow: 'WorkflowPlannerAgent',
      todo: 'TodoManagerAgent',
      chat: 'ChatSessionManagerAgent',
      observe: 'ObservabilityAgent',
      personalize: 'PersonalizationAgent',
      security: 'SecurityAgent',
      integrate: 'IntegrationAgent',
    };

    const agentName = task.type ? typeToAgent[task.type] : undefined;
    if (agentName) {
      for (const info of this.subAgents.values()) {
        if (info.agent.name === agentName && info.attached) {
          return info;
        }
      }
    }

    // Return first available agent
    for (const info of this.subAgents.values()) {
      if (info.attached && info.agent.getStatus() === 'running') {
        return info;
      }
    }

    return undefined;
  }

  // Handle agent errors with retry logic
  private async handleAgentError(agentId: string, error: string): Promise<void> {
    const info = this.subAgents.get(agentId);
    if (!info) return;

    logger.warn(this.name, `Attempting to recover agent: ${info.agent.name}`);
    
    // Try to restart the agent
    try {
      await info.agent.stop();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await info.agent.start();
      logger.info(this.name, `Successfully recovered agent: ${info.agent.name}`);
    } catch (e) {
      logger.error(this.name, `Failed to recover agent: ${info.agent.name}`, e);
      info.attached = false;
    }
  }

  // Task queue processor
  private startTaskProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.taskQueue.length === 0) return;
      
      this.isProcessing = true;
      const task = this.taskQueue.shift();
      
      if (task) {
        try {
          const result = await this.processTask(task.task);
          task.resolve(result);
        } catch (error) {
          task.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      this.isProcessing = false;
    }, 100);
  }

  // Queue a task for processing
  queueTask(task: unknown, agentId?: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task: { ...task as object, agentId }, resolve, reject });
    });
  }

  // Broadcast message to all agents
  broadcast(message: unknown): void {
    for (const info of this.subAgents.values()) {
      if (info.attached) {
        eventBus.sendMessage({
          id: crypto.randomUUID(),
          from: this.id,
          to: info.agent.id,
          type: 'event',
          content: message,
          timestamp: new Date(),
        });
      }
    }
  }

  // Get supervisor summary
  getSummary(): {
    totalAgents: number;
    attachedAgents: number;
    runningAgents: number;
    totalTasks: number;
    queuedTasks: number;
  } {
    const agents = Array.from(this.subAgents.values());
    return {
      totalAgents: agents.length,
      attachedAgents: agents.filter(a => a.attached).length,
      runningAgents: agents.filter(a => a.agent.getStatus() === 'running').length,
      totalTasks: this.metrics.tasksCompleted,
      queuedTasks: this.taskQueue.length,
    };
  }
}

export default SupervisorAgent;
