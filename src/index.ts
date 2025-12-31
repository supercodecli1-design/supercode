#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Ultimate Developer-Oriented CLI & TUI AI Platform
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';

import { SupervisorAgent } from './agents/supervisorAgent.js';
import { ModelRouterAgent } from './agents/modelRouterAgent.js';
import { ToolsManagerAgent } from './agents/toolsManagerAgent.js';
import { FunctionsAgent } from './agents/functionsAgent.js';
import { MemoryAgent } from './agents/memoryAgent.js';
import { KnowledgeAgent } from './agents/knowledgeAgent.js';
import { WorkflowPlannerAgent } from './agents/workflowPlannerAgent.js';
import { TodoManagerAgent } from './agents/todoManagerAgent.js';
import { ChatSessionManagerAgent } from './agents/chatSessionManagerAgent.js';
import { ObservabilityAgent } from './agents/observabilityAgent.js';
import { PersonalizationAgent } from './agents/personalizationAgent.js';
import { SecurityAgent } from './agents/securityAgent.js';
import { IntegrationAgent } from './agents/integrationAgent.js';

import { mcpManager } from './mcp/mcpManager.js';
import { tui } from './tui/ui.js';
import { logger } from './utils/logger.js';
import { eventBus } from './utils/eventBus.js';

import type { MenuCommand } from './types/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Global State
// ─────────────────────────────────────────────────────────────────────────────

interface SuperCodeState {
  supervisor: SupervisorAgent;
  agents: {
    modelRouter: ModelRouterAgent;
    toolsManager: ToolsManagerAgent;
    functions: FunctionsAgent;
    memory: MemoryAgent;
    knowledge: KnowledgeAgent;
    workflowPlanner: WorkflowPlannerAgent;
    todoManager: TodoManagerAgent;
    chatSessionManager: ChatSessionManagerAgent;
    observability: ObservabilityAgent;
    personalization: PersonalizationAgent;
    security: SecurityAgent;
    integration: IntegrationAgent;
  };
  isRunning: boolean;
}

let state: SuperCodeState;

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────

async function initialize(): Promise<void> {
  const spinner = ora('Initializing SuperCode...').start();

  try {
    // Create all agents
    const supervisor = new SupervisorAgent();
    const agents = {
      modelRouter: new ModelRouterAgent(),
      toolsManager: new ToolsManagerAgent(),
      functions: new FunctionsAgent(),
      memory: new MemoryAgent(),
      knowledge: new KnowledgeAgent(),
      workflowPlanner: new WorkflowPlannerAgent(),
      todoManager: new TodoManagerAgent(),
      chatSessionManager: new ChatSessionManagerAgent(),
      observability: new ObservabilityAgent(),
      personalization: new PersonalizationAgent(),
      security: new SecurityAgent(),
      integration: new IntegrationAgent(),
    };

    state = { supervisor, agents, isRunning: true };

    // Register all agents with supervisor
    spinner.text = 'Registering agents...';
    supervisor.registerAgent(agents.observability, 10);
    supervisor.registerAgent(agents.security, 10);
    supervisor.registerAgent(agents.modelRouter, 9);
    supervisor.registerAgent(agents.toolsManager, 8);
    supervisor.registerAgent(agents.functions, 8);
    supervisor.registerAgent(agents.memory, 7);
    supervisor.registerAgent(agents.knowledge, 7);
    supervisor.registerAgent(agents.workflowPlanner, 6);
    supervisor.registerAgent(agents.todoManager, 6);
    supervisor.registerAgent(agents.chatSessionManager, 5);
    supervisor.registerAgent(agents.personalization, 5);
    supervisor.registerAgent(agents.integration, 5);

    // Start supervisor (which starts all agents)
    spinner.text = 'Starting agents...';
    await supervisor.start();
    await supervisor.startAllAgents();

    // Initialize MCP Manager
    spinner.text = 'Initializing MCP servers...';
    await mcpManager.initialize();

    spinner.succeed('SuperCode initialized successfully!');
  } catch (error) {
    spinner.fail('Failed to initialize SuperCode');
    logger.error('Main', 'Initialization failed', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Command Handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleCommand(command: string): Promise<void> {
  const [cmd, ...args] = command.trim().split(' ');
  const menuCommand = cmd.toLowerCase() as MenuCommand;

  switch (menuCommand) {
    case '/model':
      await handleModelCommand(args);
      break;
    case '/chat':
      await handleChatCommand(args);
      break;
    case '/tools':
      await handleToolsCommand(args);
      break;
    case '/functions':
      await handleFunctionsCommand(args);
      break;
    case '/workflows':
      await handleWorkflowsCommand(args);
      break;
    case '/mcp':
      await handleMCPCommand(args);
      break;
    case '/agent':
      await handleAgentCommand(args);
      break;
    case '/memory':
      await handleMemoryCommand(args);
      break;
    case '/knowledge':
      await handleKnowledgeCommand(args);
      break;
    case '/planner':
      await handlePlannerCommand(args);
      break;
    case '/settings':
      await handleSettingsCommand(args);
      break;
    case '/themes':
      await handleThemesCommand(args);
      break;
    case '/debug':
      await handleDebugCommand(args);
      break;
    case '/help':
      tui.printHelp();
      break;
    case '/security':
      await handleSecurityCommand(args);
      break;
    case '/integration':
      await handleIntegrationCommand(args);
      break;
    case '/quit':
      await shutdown();
      break;
    default:
      if (cmd.startsWith('/')) {
        tui.printError(`Unknown command: ${cmd}`);
        tui.printInfo('Type /help for available commands');
      } else if (cmd.trim()) {
        // Treat as chat message
        await handleChatMessage(command);
      }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleModelCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const models = state.agents.modelRouter.getModels();
      tui.printModelList(models.map(m => ({
        name: m.name,
        provider: m.provider,
        size: m.size,
        attached: m.attached,
        vram: m.vramRequired,
      })));
      break;

    case 'attach':
      if (args[1]) {
        const success = state.agents.modelRouter.attachModel(args[1]);
        if (success) {
          tui.printSuccess(`Attached model: ${args[1]}`);
        } else {
          tui.printError(`Model not found: ${args[1]}`);
        }
      } else {
        tui.printError('Usage: /model attach <model-id>');
      }
      break;

    case 'detach':
      if (args[1]) {
        const success = state.agents.modelRouter.detachModel(args[1]);
        if (success) {
          tui.printSuccess(`Detached model: ${args[1]}`);
        } else {
          tui.printError(`Model not found: ${args[1]}`);
        }
      } else {
        tui.printError('Usage: /model detach <model-id>');
      }
      break;

    case 'refresh':
      const spinner = ora('Refreshing model list...').start();
      await state.agents.modelRouter.refresh();
      spinner.succeed('Model list refreshed');
      break;

    default:
      tui.printInfo('Model commands: list, attach <id>, detach <id>, refresh');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleChatCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const sessions = state.agents.chatSessionManager.getSessions();
      if (sessions.length === 0) {
        tui.printInfo('No chat sessions. Use /chat new to create one.');
      } else {
        tui.printTable(
          ['ID', 'Name', 'Messages', 'Updated'],
          sessions.map(s => [
            s.id.slice(0, 8),
            s.name,
            String(s.messages.length),
            s.updatedAt.toLocaleDateString(),
          ]),
          'Chat Sessions'
        );
      }
      break;

    case 'new':
      const session = await state.agents.chatSessionManager.createSession(args[1]);
      tui.printSuccess(`Created session: ${session.name}`);
      break;

    case 'select':
      if (args[1]) {
        const success = state.agents.chatSessionManager.setActiveSession(args[1]);
        if (success) {
          tui.printSuccess(`Selected session: ${args[1]}`);
        } else {
          tui.printError(`Session not found: ${args[1]}`);
        }
      }
      break;

    case 'export':
      if (args[1]) {
        const content = await state.agents.chatSessionManager.exportSession(args[1], 'markdown');
        console.log(content);
      }
      break;

    default:
      tui.printInfo('Chat commands: list, new [name], select <id>, export <id>');
  }
}

async function handleChatMessage(message: string): Promise<void> {
  let session = state.agents.chatSessionManager.getActiveSession();
  
  if (!session) {
    session = await state.agents.chatSessionManager.createSession('New Chat');
  }

  // Add user message
  await state.agents.chatSessionManager.addMessage(session.id, {
    role: 'user',
    content: message,
  });

  tui.printChatMessage('user', message);

  // Get response from LLM
  const spinner = ora('Thinking...').start();
  
  try {
    const integration = state.agents.integration.getDefaultLLM();
    if (integration) {
      const response = await state.agents.integration.chat(integration.id, message);
      spinner.stop();
      
      await state.agents.chatSessionManager.addMessage(session.id, {
        role: 'assistant',
        content: response,
      });
      
      tui.printChatMessage('assistant', response);
    } else {
      spinner.stop();
      tui.printWarning('No LLM available. Use /model to attach a model or /integration to configure one.');
    }
  } catch (error) {
    spinner.stop();
    tui.printError(`Failed to get response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tools Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleToolsCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const tools = state.agents.toolsManager.getTools();
      tui.printToolList(tools.map(t => ({
        name: t.name,
        category: t.category,
        attached: t.attached,
        enabled: t.enabled,
      })));
      break;

    case 'run':
      if (args[1]) {
        const params = args.slice(2).join(' ');
        let parsedParams = {};
        try {
          parsedParams = params ? JSON.parse(params) : {};
        } catch {
          tui.printError('Invalid JSON parameters');
          return;
        }
        
        const spinner = ora(`Running tool: ${args[1]}...`).start();
        const result = await state.agents.toolsManager.executeTool(args[1], parsedParams);
        spinner.stop();
        
        if (result.success) {
          tui.printSuccess(`Tool executed in ${result.executionTime}ms`);
          console.log(result.data);
        } else {
          tui.printError(`Tool failed: ${result.error}`);
        }
      } else {
        tui.printError('Usage: /tools run <tool-id> [params-json]');
      }
      break;

    case 'attach':
      if (args[1]) {
        state.agents.toolsManager.attachTool(args[1]);
        tui.printSuccess(`Attached tool: ${args[1]}`);
      }
      break;

    case 'detach':
      if (args[1]) {
        state.agents.toolsManager.detachTool(args[1]);
        tui.printSuccess(`Detached tool: ${args[1]}`);
      }
      break;

    default:
      tui.printInfo('Tools commands: list, run <id> [params], attach <id>, detach <id>');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Functions Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleFunctionsCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const functions = state.agents.functions.getFunctions();
      const categories = state.agents.functions.getCategories();
      
      console.log(chalk.cyan('\n📁 Function Categories:'));
      categories.forEach(cat => {
        const catFunctions = functions.filter(f => f.category === cat);
        console.log(`  ${cat}: ${catFunctions.length} functions`);
      });
      console.log();
      break;

    case 'run':
      if (args[1]) {
        const input = args.slice(2).join(' ');
        let parsedInput = {};
        try {
          parsedInput = input ? JSON.parse(input) : {};
        } catch {
          tui.printError('Invalid JSON input');
          return;
        }
        
        const result = await state.agents.functions.executeFunction(args[1], parsedInput);
        if (result.success) {
          tui.printSuccess(`Function executed in ${result.executionTime}ms`);
          console.log(result.data);
        } else {
          tui.printError(`Function failed: ${result.error}`);
        }
      }
      break;

    default:
      tui.printInfo('Functions commands: list, run <id> [input-json]');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflows Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleWorkflowsCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const workflows = state.agents.workflowPlanner.getWorkflows();
      tui.printTable(
        ['ID', 'Name', 'Steps', 'Attached'],
        workflows.map(w => [
          w.id,
          w.name,
          String(w.steps.length),
          w.attached ? '✓' : '✗',
        ]),
        'Workflows'
      );
      break;

    case 'run':
      if (args[1]) {
        const spinner = ora(`Running workflow: ${args[1]}...`).start();
        try {
          const execution = await state.agents.workflowPlanner.executeWorkflow(args[1]);
          spinner.succeed(`Workflow started: ${execution.id}`);
        } catch (error) {
          spinner.fail(`Workflow failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      break;

    case 'status':
      const executions = state.agents.workflowPlanner.getExecutions();
      tui.printTable(
        ['ID', 'Workflow', 'Status', 'Started'],
        executions.map(e => [
          e.id.slice(0, 8),
          e.workflowId,
          e.status,
          e.startTime.toLocaleTimeString(),
        ]),
        'Workflow Executions'
      );
      break;

    default:
      tui.printInfo('Workflows commands: list, run <id>, status');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleMCPCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const servers = mcpManager.getServers();
      tui.printMCPServers(servers.map(s => ({
        name: s.config.name,
        status: s.status,
        attached: s.config.attached,
        description: s.config.description,
      })));
      break;

    case 'start':
      if (args[1]) {
        const spinner = ora(`Starting MCP server: ${args[1]}...`).start();
        const success = await mcpManager.startServer(args[1]);
        if (success) {
          spinner.succeed(`Started: ${args[1]}`);
        } else {
          spinner.fail(`Failed to start: ${args[1]}`);
        }
      }
      break;

    case 'stop':
      if (args[1]) {
        const spinner = ora(`Stopping MCP server: ${args[1]}...`).start();
        const success = await mcpManager.stopServer(args[1]);
        if (success) {
          spinner.succeed(`Stopped: ${args[1]}`);
        } else {
          spinner.fail(`Failed to stop: ${args[1]}`);
        }
      }
      break;

    case 'status':
      const summary = mcpManager.getStatusSummary();
      console.log(chalk.cyan('\n🔌 MCP Server Status:'));
      console.log(`  Total: ${summary.total}`);
      console.log(`  Attached: ${summary.attached}`);
      console.log(`  Running: ${chalk.green(summary.running)}`);
      console.log(`  Stopped: ${chalk.gray(summary.stopped)}`);
      console.log(`  Error: ${chalk.red(summary.error)}`);
      console.log();
      break;

    default:
      tui.printInfo('MCP commands: list, start <id>, stop <id>, status');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleAgentCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const agentsStatus = state.supervisor.getAgentsStatus();
      tui.printAgentStatus(agentsStatus.map(a => ({
        name: a.name,
        status: a.status,
        attached: a.attached,
        tasks: a.metrics.tasksCompleted,
      })));
      break;

    case 'summary':
      const summary = state.supervisor.getSummary();
      console.log(chalk.cyan('\n🎯 Agent Summary:'));
      console.log(`  Total Agents: ${summary.totalAgents}`);
      console.log(`  Attached: ${summary.attachedAgents}`);
      console.log(`  Running: ${chalk.green(summary.runningAgents)}`);
      console.log(`  Tasks Completed: ${summary.totalTasks}`);
      console.log(`  Queued Tasks: ${summary.queuedTasks}`);
      console.log();
      break;

    default:
      tui.printInfo('Agent commands: list, summary');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleMemoryCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const memories = await state.agents.memory.search({ limit: 10 });
      tui.printTable(
        ['ID', 'Type', 'Content', 'Created'],
        memories.map(m => [
          m.id.slice(0, 8),
          m.type,
          m.content.slice(0, 40) + '...',
          m.createdAt.toLocaleDateString(),
        ]),
        'Recent Memories'
      );
      break;

    case 'stats':
      const stats = await state.agents.memory.getStats();
      console.log(chalk.cyan('\n🧠 Memory Stats:'));
      console.log(`  Total Entries: ${stats.total}`);
      console.log(`  Cache Size: ${stats.cacheSize}`);
      console.log('  By Type:', stats.byType);
      console.log();
      break;

    case 'clear':
      const count = await state.agents.memory.clear();
      tui.printSuccess(`Cleared ${count} memory entries`);
      break;

    default:
      tui.printInfo('Memory commands: list, stats, clear');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleKnowledgeCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const docs = state.agents.knowledge.getAllDocuments();
      tui.printTable(
        ['ID', 'Title', 'Type', 'Version'],
        docs.map(d => [
          d.id.slice(0, 8),
          d.title,
          d.type,
          String(d.version),
        ]),
        'Knowledge Base Documents'
      );
      break;

    case 'search':
      if (args[1]) {
        const results = await state.agents.knowledge.search({ query: args.slice(1).join(' ') });
        console.log(chalk.cyan(`\nFound ${results.length} results:`));
        results.forEach(doc => {
          console.log(`  📄 ${doc.title} (${doc.type})`);
        });
      }
      break;

    case 'stats':
      const stats = state.agents.knowledge.getStats();
      console.log(chalk.cyan('\n📚 Knowledge Base Stats:'));
      console.log(`  Total Documents: ${stats.totalDocuments}`);
      console.log(`  Total Tags: ${stats.totalTags}`);
      console.log(`  With Embeddings: ${stats.withEmbeddings}`);
      console.log('  By Type:', stats.byType);
      console.log();
      break;

    default:
      tui.printInfo('Knowledge commands: list, search <query>, stats');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Planner Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handlePlannerCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const todos = state.agents.todoManager.getTodos();
      tui.printTable(
        ['ID', 'Title', 'Priority', 'Status', 'Due'],
        todos.map(t => [
          t.id.slice(0, 8),
          t.title.slice(0, 30),
          t.priority,
          t.status,
          t.dueDate?.toLocaleDateString() || '-',
        ]),
        'Todo Items'
      );
      break;

    case 'add':
      if (args[1]) {
        const todo = await state.agents.todoManager.addTodo({
          title: args.slice(1).join(' '),
        });
        tui.printSuccess(`Added todo: ${todo.title}`);
      }
      break;

    case 'complete':
      if (args[1]) {
        await state.agents.todoManager.completeTodo(args[1]);
        tui.printSuccess(`Completed todo: ${args[1]}`);
      }
      break;

    case 'stats':
      const stats = state.agents.todoManager.getStats();
      console.log(chalk.cyan('\n📋 Todo Stats:'));
      console.log(`  Total: ${stats.total}`);
      console.log(`  Pending: ${chalk.yellow(stats.byStatus.pending)}`);
      console.log(`  In Progress: ${chalk.blue(stats.byStatus.in_progress)}`);
      console.log(`  Completed: ${chalk.green(stats.byStatus.completed)}`);
      console.log(`  Overdue: ${chalk.red(stats.overdue)}`);
      console.log();
      break;

    default:
      tui.printInfo('Planner commands: list, add <title>, complete <id>, stats');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleSettingsCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const settings = state.agents.personalization.getGlobalSettings();
      console.log(chalk.cyan('\n⚙️ Global Settings:'));
      Object.entries(settings).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
      console.log();
      break;

    case 'set':
      if (args[1] && args[2]) {
        let value: unknown = args.slice(2).join(' ');
        try {
          value = JSON.parse(value as string);
        } catch {
          // Keep as string
        }
        state.agents.personalization.setSetting(args[1] as any, value as any);
        tui.printSuccess(`Set ${args[1]} = ${value}`);
      }
      break;

    default:
      tui.printInfo('Settings commands: list, set <key> <value>');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Themes Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleThemesCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const themes = state.agents.personalization.getThemes();
      const current = state.agents.personalization.getCurrentTheme();
      console.log(chalk.cyan('\n🎨 Available Themes:'));
      themes.forEach(theme => {
        const isCurrent = theme.name === current.name ? chalk.green(' (current)') : '';
        console.log(`  ${theme.name}${isCurrent}`);
      });
      console.log();
      break;

    case 'set':
      if (args[1]) {
        const success = state.agents.personalization.setTheme(args[1]);
        if (success) {
          tui.printSuccess(`Theme changed to: ${args[1]}`);
        } else {
          tui.printError(`Theme not found: ${args[1]}`);
        }
      }
      break;

    default:
      tui.printInfo('Themes commands: list, set <name>');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Debug Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleDebugCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'logs':
      const logs = state.agents.observability.getLogs({ limit: 20 });
      logs.forEach(log => {
        const levelColor = {
          debug: chalk.gray,
          info: chalk.blue,
          warn: chalk.yellow,
          error: chalk.red,
          fatal: chalk.bgRed,
        }[log.level] || chalk.white;
        console.log(`${chalk.gray(log.timestamp.toISOString())} ${levelColor(log.level)} [${log.source}] ${log.message}`);
      });
      break;

    case 'errors':
      const errors = state.agents.observability.getUnresolvedErrors();
      if (errors.length === 0) {
        tui.printSuccess('No unresolved errors');
      } else {
        tui.printTable(
          ['ID', 'Source', 'Error', 'Time'],
          errors.map(e => [
            e.id.slice(0, 8),
            e.source,
            e.error.slice(0, 40),
            e.timestamp.toLocaleTimeString(),
          ]),
          'Unresolved Errors'
        );
      }
      break;

    case 'metrics':
      const dashboard = state.agents.observability.getDashboardData();
      console.log(chalk.cyan('\n📊 Metrics Dashboard:'));
      console.log(`  Total Logs: ${dashboard.logs.total}`);
      console.log(`  Errors: ${dashboard.errors.unresolved} unresolved`);
      console.log(`  Metric Names: ${dashboard.metrics.names.length}`);
      console.log();
      break;

    default:
      tui.printInfo('Debug commands: logs, errors, metrics');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleSecurityCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'secrets':
      const secrets = state.agents.security.listSecrets();
      tui.printTable(
        ['Name', 'Type', 'Created', 'Last Used'],
        secrets.map(s => [
          s.name,
          s.type,
          s.createdAt.toLocaleDateString(),
          s.lastUsed?.toLocaleDateString() || '-',
        ]),
        'Stored Secrets'
      );
      break;

    case 'set':
      if (args[1] && args[2]) {
        await state.agents.security.setSecret(args[1], args[2]);
        tui.printSuccess(`Secret stored: ${args[1]}`);
      }
      break;

    case 'generate':
      const token = state.agents.security.generateApiKey();
      console.log(chalk.cyan('\n🔑 Generated API Key:'));
      console.log(`  ${token}`);
      console.log();
      break;

    default:
      tui.printInfo('Security commands: secrets, set <name> <value>, generate');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration Commands
// ─────────────────────────────────────────────────────────────────────────────

async function handleIntegrationCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
    case undefined:
      const integrations = state.agents.integration.getIntegrations();
      tui.printTable(
        ['ID', 'Name', 'Type', 'Enabled', 'Health'],
        integrations.map(i => {
          const health = state.agents.integration.getHealthStatus(i.id);
          return [
            i.id,
            i.name,
            i.type,
            i.enabled ? '✓' : '✗',
            health?.healthy ? chalk.green('●') : chalk.red('●'),
          ];
        }),
        'Integrations'
      );
      break;

    case 'test':
      if (args[1]) {
        const spinner = ora(`Testing integration: ${args[1]}...`).start();
        const result = await state.agents.integration.testIntegration(args[1]);
        if (result.success) {
          spinner.succeed(`Integration healthy (${result.latency}ms)`);
        } else {
          spinner.fail(`Integration unhealthy: ${result.message}`);
        }
      }
      break;

    case 'enable':
      if (args[1]) {
        state.agents.integration.enableIntegration(args[1]);
        tui.printSuccess(`Enabled: ${args[1]}`);
      }
      break;

    case 'disable':
      if (args[1]) {
        state.agents.integration.disableIntegration(args[1]);
        tui.printSuccess(`Disabled: ${args[1]}`);
      }
      break;

    default:
      tui.printInfo('Integration commands: list, test <id>, enable <id>, disable <id>');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shutdown
// ─────────────────────────────────────────────────────────────────────────────

async function shutdown(): Promise<void> {
  console.log();
  const spinner = ora('Shutting down SuperCode...').start();

  try {
    state.isRunning = false;
    await mcpManager.shutdown();
    await state.supervisor.stop();
    spinner.succeed('SuperCode shut down successfully');
    process.exit(0);
  } catch (error) {
    spinner.fail('Error during shutdown');
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Mode
// ─────────────────────────────────────────────────────────────────────────────

async function runInteractive(): Promise<void> {
  tui.printBanner();
  tui.printCompactMenu();

  // Print dashboard
  tui.printDashboard({
    agents: { total: 12, running: state.supervisor.getSummary().runningAgents },
    models: { total: state.agents.modelRouter.getModels().length, attached: state.agents.modelRouter.getAttachedModels().length },
    tools: { total: state.agents.toolsManager.getTools().length, attached: state.agents.toolsManager.getAttachedTools().length },
    mcp: { total: mcpManager.getServers().length, running: mcpManager.getRunningServers().length },
    memory: { entries: (await state.agents.memory.getStats()).total },
    tasks: { pending: state.agents.todoManager.getStats().byStatus.pending, completed: state.agents.todoManager.getStats().byStatus.completed },
  });

  // Main loop
  while (state.isRunning) {
    try {
      const { command } = await inquirer.prompt([
        {
          type: 'input',
          name: 'command',
          message: chalk.cyan('supercode >'),
          prefix: '',
        },
      ]);

      if (command.trim()) {
        await handleCommand(command);
      }
    } catch (error) {
      if ((error as any).isTtyError) {
        // Running in non-interactive mode
        break;
      }
      // Handle Ctrl+C
      if ((error as any).message?.includes('User force closed')) {
        await shutdown();
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Setup
// ─────────────────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('supercode')
  .description('Ultimate Developer-Oriented CLI & TUI AI Platform')
  .version('1.0.0');

program
  .command('start')
  .description('Start SuperCode in interactive mode')
  .action(async () => {
    await initialize();
    await runInteractive();
  });

program
  .command('run <command>')
  .description('Run a single command')
  .action(async (command: string) => {
    await initialize();
    await handleCommand(command);
    await shutdown();
  });

program
  .command('models')
  .description('List available models')
  .action(async () => {
    await initialize();
    await handleCommand('/model list');
    await shutdown();
  });

program
  .command('tools')
  .description('List available tools')
  .action(async () => {
    await initialize();
    await handleCommand('/tools list');
    await shutdown();
  });

program
  .command('agents')
  .description('Show agent status')
  .action(async () => {
    await initialize();
    await handleCommand('/agent list');
    await shutdown();
  });

// Default action - start interactive mode
program.action(async () => {
  await initialize();
  await runInteractive();
});

// Handle signals
process.on('SIGINT', async () => {
  if (state?.isRunning) {
    await shutdown();
  }
});

process.on('SIGTERM', async () => {
  if (state?.isRunning) {
    await shutdown();
  }
});

// Parse arguments
program.parse();
