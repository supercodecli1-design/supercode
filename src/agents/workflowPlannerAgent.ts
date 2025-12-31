// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Workflow Planner Agent
// Multi-step workflows, LangGraph & LangFlow integration
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { WorkflowDefinition, WorkflowExecution, WorkflowStep, WorkflowStatus } from '../types/index.js';
import { eventBus } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowPlannerAgent extends BaseAgent {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private runningExecutions: Set<string> = new Set();

  constructor() {
    super({ name: 'WorkflowPlannerAgent', priority: 6 });
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '🔄 Initializing Workflow Planner Agent');
    await this.loadBuiltInWorkflows();
    logger.info(this.name, `Loaded ${this.workflows.size} workflows`);
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down Workflow Planner Agent');
    
    // Cancel all running executions
    for (const executionId of this.runningExecutions) {
      await this.cancelExecution(executionId);
    }
    
    this.workflows.clear();
    this.executions.clear();
  }

  protected async processTask(task: unknown): Promise<unknown> {
    const { action, ...params } = task as { action: string; [key: string]: unknown };
    
    switch (action) {
      case 'execute':
        return this.executeWorkflow(params.workflowId as string, params.context as Record<string, unknown>);
      case 'list':
        return this.getWorkflows();
      case 'status':
        return this.getExecutionStatus(params.executionId as string);
      case 'cancel':
        return this.cancelExecution(params.executionId as string);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async loadBuiltInWorkflows(): Promise<void> {
    // Code Generation Workflow
    this.registerWorkflow({
      id: 'code-generation',
      name: 'Code Generation Workflow',
      description: 'Generate code based on requirements',
      version: '1.0.0',
      attached: true,
      enabled: true,
      steps: [
        {
          id: 'analyze',
          name: 'Analyze Requirements',
          type: 'agent',
          config: { agentType: 'model', task: 'analyze_requirements' },
          next: 'plan',
        },
        {
          id: 'plan',
          name: 'Create Implementation Plan',
          type: 'agent',
          config: { agentType: 'model', task: 'create_plan' },
          next: 'generate',
        },
        {
          id: 'generate',
          name: 'Generate Code',
          type: 'agent',
          config: { agentType: 'model', task: 'generate_code' },
          next: 'review',
        },
        {
          id: 'review',
          name: 'Review Code',
          type: 'agent',
          config: { agentType: 'model', task: 'review_code' },
          next: 'finalize',
        },
        {
          id: 'finalize',
          name: 'Finalize Output',
          type: 'function',
          config: { functionId: 'format-output' },
        },
      ],
    });

    // File Processing Workflow
    this.registerWorkflow({
      id: 'file-processing',
      name: 'File Processing Workflow',
      description: 'Process and transform files',
      version: '1.0.0',
      attached: true,
      enabled: true,
      steps: [
        {
          id: 'read',
          name: 'Read Files',
          type: 'tool',
          config: { toolId: 'file-read' },
          next: 'transform',
        },
        {
          id: 'transform',
          name: 'Transform Content',
          type: 'function',
          config: { functionId: 'string-replace' },
          next: 'write',
        },
        {
          id: 'write',
          name: 'Write Output',
          type: 'tool',
          config: { toolId: 'file-write' },
        },
      ],
    });

    // Data Analysis Workflow
    this.registerWorkflow({
      id: 'data-analysis',
      name: 'Data Analysis Workflow',
      description: 'Analyze and summarize data',
      version: '1.0.0',
      attached: true,
      enabled: true,
      steps: [
        {
          id: 'load',
          name: 'Load Data',
          type: 'tool',
          config: { toolId: 'file-read' },
          next: 'parse',
        },
        {
          id: 'parse',
          name: 'Parse Data',
          type: 'tool',
          config: { toolId: 'json-parse' },
          next: 'analyze',
        },
        {
          id: 'analyze',
          name: 'Analyze Data',
          type: 'agent',
          config: { agentType: 'model', task: 'analyze_data' },
          next: 'report',
        },
        {
          id: 'report',
          name: 'Generate Report',
          type: 'agent',
          config: { agentType: 'model', task: 'generate_report' },
        },
      ],
    });

    // Git Operations Workflow
    this.registerWorkflow({
      id: 'git-operations',
      name: 'Git Operations Workflow',
      description: 'Automated git operations',
      version: '1.0.0',
      attached: true,
      enabled: true,
      steps: [
        {
          id: 'status',
          name: 'Check Status',
          type: 'tool',
          config: { toolId: 'git-status' },
          next: 'check',
        },
        {
          id: 'check',
          name: 'Check for Changes',
          type: 'condition',
          config: { condition: 'context.status.length > 0' },
          next: ['diff', 'done'],
        },
        {
          id: 'diff',
          name: 'Get Diff',
          type: 'tool',
          config: { toolId: 'git-diff' },
          next: 'done',
        },
        {
          id: 'done',
          name: 'Complete',
          type: 'function',
          config: { functionId: 'object-merge' },
        },
      ],
    });

    // Multi-Step Planner Workflow
    this.registerWorkflow({
      id: 'multi-step-planner',
      name: 'Multi-Step Task Planner',
      description: 'Plan and execute complex multi-step tasks',
      version: '1.0.0',
      attached: true,
      enabled: true,
      steps: [
        {
          id: 'decompose',
          name: 'Decompose Task',
          type: 'agent',
          config: { agentType: 'model', task: 'decompose_task' },
          next: 'prioritize',
        },
        {
          id: 'prioritize',
          name: 'Prioritize Steps',
          type: 'agent',
          config: { agentType: 'model', task: 'prioritize_steps' },
          next: 'execute-loop',
        },
        {
          id: 'execute-loop',
          name: 'Execute Steps',
          type: 'loop',
          config: { items: 'context.steps', stepId: 'execute-step' },
          next: 'summarize',
        },
        {
          id: 'execute-step',
          name: 'Execute Single Step',
          type: 'agent',
          config: { agentType: 'model', task: 'execute_step' },
        },
        {
          id: 'summarize',
          name: 'Summarize Results',
          type: 'agent',
          config: { agentType: 'model', task: 'summarize_results' },
        },
      ],
    });
  }

  // Register a new workflow
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    logger.debug(this.name, `Registered workflow: ${workflow.name}`);
  }

  // Unregister a workflow
  unregisterWorkflow(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }

  // Execute a workflow
  async executeWorkflow(workflowId: string, context: Record<string, unknown> = {}): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    if (!workflow.attached || !workflow.enabled) {
      throw new Error(`Workflow not available: ${workflowId}`);
    }

    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId,
      status: 'running',
      currentStep: workflow.steps[0]?.id,
      startTime: new Date(),
      context,
      results: {},
      errors: [],
    };

    this.executions.set(execution.id, execution);
    this.runningExecutions.add(execution.id);
    
    eventBus.emitEvent({ type: 'workflow:started', workflowId, executionId: execution.id });
    logger.info(this.name, `Started workflow: ${workflow.name} (${execution.id})`);

    // Execute workflow asynchronously
    this.runWorkflow(workflow, execution).catch(error => {
      execution.status = 'failed';
      execution.errors.push(error.message);
      execution.endTime = new Date();
      this.runningExecutions.delete(execution.id);
      eventBus.emitEvent({ type: 'workflow:failed', workflowId, executionId: execution.id, error: error.message });
    });

    return execution;
  }

  // Run workflow steps
  private async runWorkflow(workflow: WorkflowDefinition, execution: WorkflowExecution): Promise<void> {
    const stepMap = new Map(workflow.steps.map(s => [s.id, s]));
    let currentStepId = workflow.steps[0]?.id;

    while (currentStepId && execution.status === 'running') {
      const step = stepMap.get(currentStepId);
      if (!step) break;

      execution.currentStep = currentStepId;
      logger.debug(this.name, `Executing step: ${step.name}`);

      try {
        const result = await this.executeStep(step, execution);
        execution.results[step.id] = result;

        // Determine next step
        if (step.next) {
          if (Array.isArray(step.next)) {
            // Conditional branching
            const conditionResult = this.evaluateCondition(step.condition || 'true', execution);
            currentStepId = conditionResult ? step.next[0] : step.next[1];
          } else {
            currentStepId = step.next;
          }
        } else {
          break; // No next step, exit loop
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        execution.errors.push(`Step ${step.name}: ${errorMsg}`);
        logger.error(this.name, `Step failed: ${step.name}`, error);
        
        // Continue to next step or fail based on configuration
        if (step.next && !Array.isArray(step.next)) {
          currentStepId = step.next;
        } else {
          execution.status = 'failed';
          break;
        }
      }
    }

    if (execution.status === 'running') {
      execution.status = 'completed';
      eventBus.emitEvent({ type: 'workflow:completed', workflowId: workflow.id, executionId: execution.id });
    }

    execution.endTime = new Date();
    this.runningExecutions.delete(execution.id);
    logger.info(this.name, `Workflow ${execution.status}: ${workflow.name}`);
  }

  // Execute a single step
  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<unknown> {
    switch (step.type) {
      case 'tool':
        return this.executeToolStep(step, execution);
      case 'function':
        return this.executeFunctionStep(step, execution);
      case 'agent':
        return this.executeAgentStep(step, execution);
      case 'condition':
        return this.evaluateCondition(step.config.condition as string, execution);
      case 'loop':
        return this.executeLoopStep(step, execution);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeToolStep(step: WorkflowStep, execution: WorkflowExecution): Promise<unknown> {
    // Send request to ToolsManagerAgent
    const result = await this.sendRequest('ToolsManagerAgent', {
      action: 'execute',
      toolId: step.config.toolId,
      params: this.resolveParams((step.config.params || {}) as Record<string, unknown>, execution),
    });
    return result;
  }

  private async executeFunctionStep(step: WorkflowStep, execution: WorkflowExecution): Promise<unknown> {
    // Send request to FunctionsAgent
    const result = await this.sendRequest('FunctionsAgent', {
      action: 'execute',
      functionId: step.config.functionId,
      input: this.resolveParams((step.config.input || {}) as Record<string, unknown>, execution),
    });
    return result;
  }

  private async executeAgentStep(step: WorkflowStep, execution: WorkflowExecution): Promise<unknown> {
    // Simulate agent execution (would connect to actual LLM)
    logger.debug(this.name, `Agent step: ${step.config.task}`);
    return { task: step.config.task, context: execution.context };
  }

  private async executeLoopStep(step: WorkflowStep, execution: WorkflowExecution): Promise<unknown[]> {
    const items = this.resolveValue(step.config.items as string, execution) as unknown[];
    const results: unknown[] = [];

    for (const item of items) {
      execution.context.currentItem = item;
      // Execute the referenced step for each item
      const innerStep = this.workflows.get(execution.workflowId)?.steps.find(s => s.id === step.config.stepId);
      if (innerStep) {
        const result = await this.executeStep(innerStep, execution);
        results.push(result);
      }
    }

    return results;
  }

  private evaluateCondition(condition: string, execution: WorkflowExecution): boolean {
    try {
      const fn = new Function('context', 'results', `return ${condition}`);
      return fn(execution.context, execution.results);
    } catch {
      return false;
    }
  }

  private resolveParams(params: Record<string, unknown>, execution: WorkflowExecution): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('context.')) {
        resolved[key] = this.resolveValue(value, execution);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  private resolveValue(path: string, execution: WorkflowExecution): unknown {
    const parts = path.split('.');
    let value: unknown = { context: execution.context, results: execution.results };
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  // Cancel a running execution
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'failed';
    execution.errors.push('Cancelled by user');
    execution.endTime = new Date();
    this.runningExecutions.delete(executionId);
    
    logger.info(this.name, `Cancelled execution: ${executionId}`);
    return true;
  }

  // Pause a running execution
  async pauseExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'paused';
    logger.info(this.name, `Paused execution: ${executionId}`);
    return true;
  }

  // Resume a paused execution
  async resumeExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'paused') {
      return false;
    }

    execution.status = 'running';
    logger.info(this.name, `Resumed execution: ${executionId}`);
    
    // Continue execution
    const workflow = this.workflows.get(execution.workflowId);
    if (workflow) {
      this.runWorkflow(workflow, execution);
    }
    
    return true;
  }

  // Get execution status
  getExecutionStatus(executionId: string): WorkflowExecution | null {
    return this.executions.get(executionId) || null;
  }

  // Get all workflows
  getWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  // Get attached workflows
  getAttachedWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values()).filter(w => w.attached);
  }

  // Get workflow by ID
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  // Attach a workflow
  attachWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.attached = true;
      return true;
    }
    return false;
  }

  // Detach a workflow
  detachWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.attached = false;
      return true;
    }
    return false;
  }

  // Get all executions
  getExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  // Get running executions
  getRunningExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(e => e.status === 'running');
  }
}

export default WorkflowPlannerAgent;
