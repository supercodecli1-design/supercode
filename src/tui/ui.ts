// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - TUI Interface
// Interactive terminal UI with menus, themes, and TOON-style formatting
// ═══════════════════════════════════════════════════════════════════════════════

import chalk from 'chalk';
import boxen from 'boxen';
import figlet from 'figlet';
import gradient from 'gradient-string';
import Table from 'cli-table3';
import type { MenuItem, MenuCommand, Theme } from '../types/index.js';

// TOON-style color gradients
const toonGradient = gradient(['#ff6b6b', '#4ecdc4', '#ffe66d']);
const codeGradient = gradient(['#61afef', '#98c379', '#c678dd']);

export class TUI {
  private currentTheme: Theme;

  constructor(theme?: Theme) {
    this.currentTheme = theme || this.getDefaultTheme();
  }

  private getDefaultTheme(): Theme {
    return {
      name: 'toon',
      colors: {
        primary: '#ff6b6b',
        secondary: '#4ecdc4',
        accent: '#ffe66d',
        background: '#2c3e50',
        foreground: '#ecf0f1',
        success: '#2ecc71',
        warning: '#f39c12',
        error: '#e74c3c',
        info: '#3498db',
        border: '#95a5a6',
      },
      styles: {
        boxStyle: 'round',
        headerStyle: 'gradient',
      },
    };
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Banner & Headers
  // ─────────────────────────────────────────────────────────────────────────────

  printBanner(): void {
    console.clear();
    const banner = figlet.textSync('SuperCode', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
    });
    console.log(toonGradient(banner));
    console.log(chalk.gray('═'.repeat(70)));
    console.log(chalk.cyan('  🚀 Ultimate Developer-Oriented CLI & TUI AI Platform'));
    console.log(chalk.gray('  📦 Sub-Agent Orchestration • Local LLMs • 100+ Tools'));
    console.log(chalk.gray('═'.repeat(70)));
    console.log();
  }

  printHeader(title: string, subtitle?: string): void {
    console.log();
    console.log(toonGradient(`╔${'═'.repeat(title.length + 4)}╗`));
    console.log(toonGradient(`║  ${title}  ║`));
    console.log(toonGradient(`╚${'═'.repeat(title.length + 4)}╝`));
    if (subtitle) {
      console.log(chalk.gray(`  ${subtitle}`));
    }
    console.log();
  }

  printSectionHeader(title: string, icon: string = '📌'): void {
    console.log();
    console.log(chalk.cyan(`${icon} ${title}`));
    console.log(chalk.gray('─'.repeat(50)));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Menus
  // ─────────────────────────────────────────────────────────────────────────────

  getMenuItems(): MenuItem[] {
    return [
      { command: '/model', label: 'Models', description: 'Model list, attach/detach, personalize, tuning', icon: '🤖', shortcut: 'M' },
      { command: '/chat', label: 'Chat', description: 'Chat sessions, export/import/search, merge', icon: '💬', shortcut: 'C' },
      { command: '/tools', label: 'Tools', description: '100+ tools, toggle attach/detach, runtime config', icon: '🔧', shortcut: 'T' },
      { command: '/functions', label: 'Functions', description: '100+ functions, runtime execution, attach/detach', icon: '⚡', shortcut: 'F' },
      { command: '/workflows', label: 'Workflows', description: 'Multi-step workflows, LangGraph + LangFlow', icon: '🔄', shortcut: 'W' },
      { command: '/mcp', label: 'MCP Servers', description: '50+ local MCP servers, start/stop/config/monitor', icon: '🔌', shortcut: 'P' },
      { command: '/agent', label: 'Agents', description: 'Supervisor & SubAgent status, live metrics', icon: '🎯', shortcut: 'A' },
      { command: '/memory', label: 'Memory', description: 'View, edit, clear, backup, sync across agents', icon: '🧠', shortcut: 'E' },
      { command: '/knowledge', label: 'Knowledge', description: 'Persistent KB, RAG, document retrieval', icon: '📚', shortcut: 'K' },
      { command: '/planner', label: 'Planner', description: 'Todo & task manager, multi-file code scheduling', icon: '📋', shortcut: 'L' },
      { command: '/export', label: 'Export', description: 'Export configs, workflows, tools, functions', icon: '📤', shortcut: 'X' },
      { command: '/import', label: 'Import', description: 'Import configs, workflows, tools, functions', icon: '📥', shortcut: 'I' },
      { command: '/settings', label: 'Settings', description: 'Global & agent-specific config, hot reload', icon: '⚙️', shortcut: 'S' },
      { command: '/themes', label: 'Themes', description: 'IDE themes, TUI themes, light/dark/high-contrast', icon: '🎨', shortcut: 'H' },
      { command: '/debug', label: 'Debug', description: 'Observability, logging, retry, error events', icon: '🐛', shortcut: 'D' },
      { command: '/help', label: 'Help', description: 'Interactive hints, tooltips, example commands', icon: '❓', shortcut: '?' },
      { command: '/notifications', label: 'Notifications', description: 'Runtime notifications, task alerts', icon: '🔔', shortcut: 'N' },
      { command: '/updates', label: 'Updates', description: 'Check & update models, tools, workflows', icon: '🔄', shortcut: 'U' },
      { command: '/integration', label: 'Integration', description: 'Integrate external LLMs, APIs, data sources', icon: '🔗', shortcut: 'G' },
      { command: '/shortcuts', label: 'Shortcuts', description: 'Custom keyboard shortcuts, macro actions', icon: '⌨️', shortcut: 'R' },
      { command: '/security', label: 'Security', description: 'Permission control, token & secret management', icon: '🔐', shortcut: 'Y' },
      { command: '/quit', label: 'Quit', description: 'Exit SuperCode', icon: '🚪', shortcut: 'Q' },
    ];
  }

  printMenu(): void {
    const items = this.getMenuItems();
    
    console.log(boxen(
      chalk.bold.cyan('📌 MAIN MENU') + '\n\n' +
      items.map(item => 
        `${item.icon} ${chalk.cyan(item.command.padEnd(15))} ${chalk.white(item.label.padEnd(15))} ${chalk.gray(item.description)}`
      ).join('\n'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        title: '🎯 SuperCode Commands',
        titleAlignment: 'center',
      }
    ));
  }

  printCompactMenu(): void {
    const items = this.getMenuItems();
    const columns = 3;
    const rows = Math.ceil(items.length / columns);
    
    console.log(chalk.cyan('\n📌 Quick Commands:'));
    for (let i = 0; i < rows; i++) {
      let row = '';
      for (let j = 0; j < columns; j++) {
        const idx = i + j * rows;
        if (idx < items.length) {
          const item = items[idx];
          row += `${item.icon} ${chalk.cyan(item.command.padEnd(14))}`;
        }
      }
      console.log(row);
    }
    console.log();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tables
  // ─────────────────────────────────────────────────────────────────────────────

  printTable(headers: string[], rows: string[][], title?: string): void {
    const table = new Table({
      head: headers.map(h => chalk.cyan.bold(h)),
      style: {
        head: [],
        border: ['gray'],
      },
    });

    rows.forEach(row => table.push(row));

    if (title) {
      console.log(chalk.cyan.bold(`\n${title}`));
    }
    console.log(table.toString());
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Status & Info Boxes
  // ─────────────────────────────────────────────────────────────────────────────

  printBox(content: string, options?: { title?: string; color?: string; padding?: number }): void {
    console.log(boxen(content, {
      padding: options?.padding ?? 1,
      borderStyle: 'round',
      borderColor: options?.color || 'cyan',
      title: options?.title,
      titleAlignment: 'center',
    }));
  }

  printSuccess(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  printError(message: string): void {
    console.log(chalk.red(`❌ ${message}`));
  }

  printWarning(message: string): void {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  printInfo(message: string): void {
    console.log(chalk.blue(`ℹ️  ${message}`));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Progress & Loading
  // ─────────────────────────────────────────────────────────────────────────────

  printProgress(current: number, total: number, label: string = ''): void {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round(percentage / 5);
    const empty = 20 - filled;
    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    process.stdout.write(`\r${bar} ${percentage}% ${label}`);
    if (current === total) console.log();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Agent Status Display
  // ─────────────────────────────────────────────────────────────────────────────

  printAgentStatus(agents: Array<{ name: string; status: string; attached: boolean; tasks: number }>): void {
    this.printSectionHeader('Agent Status', '🎯');
    
    const statusColors: Record<string, (s: string) => string> = {
      running: chalk.green,
      idle: chalk.blue,
      stopped: chalk.gray,
      error: chalk.red,
    };

    agents.forEach(agent => {
      const statusFn = statusColors[agent.status] || chalk.white;
      const attachedIcon = agent.attached ? chalk.green('●') : chalk.gray('○');
      console.log(
        `  ${attachedIcon} ${chalk.white(agent.name.padEnd(25))} ` +
        `${statusFn(agent.status.padEnd(10))} ` +
        `${chalk.gray(`Tasks: ${agent.tasks}`)}`
      );
    });
    console.log();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Display
  // ─────────────────────────────────────────────────────────────────────────────

  printModelList(models: Array<{ name: string; provider: string; size: string; attached: boolean; vram: number }>): void {
    this.printSectionHeader('Available Models', '🤖');
    
    const sizeColors: Record<string, (s: string) => string> = {
      small: chalk.green,
      medium: chalk.yellow,
      large: chalk.red,
    };

    models.forEach(model => {
      const attachedIcon = model.attached ? chalk.green('●') : chalk.gray('○');
      const sizeFn = sizeColors[model.size] || chalk.white;
      console.log(
        `  ${attachedIcon} ${chalk.white(model.name.padEnd(25))} ` +
        `${chalk.cyan(model.provider.padEnd(10))} ` +
        `${sizeFn(model.size.padEnd(8))} ` +
        `${chalk.gray(`${model.vram}MB`)}`
      );
    });
    console.log();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tool Display
  // ─────────────────────────────────────────────────────────────────────────────

  printToolList(tools: Array<{ name: string; category: string; attached: boolean; enabled: boolean }>): void {
    this.printSectionHeader('Available Tools', '🔧');
    
    // Group by category
    const byCategory = new Map<string, typeof tools>();
    tools.forEach(tool => {
      const cat = byCategory.get(tool.category) || [];
      cat.push(tool);
      byCategory.set(tool.category, cat);
    });

    for (const [category, categoryTools] of byCategory) {
      console.log(chalk.cyan(`  📁 ${category}`));
      categoryTools.forEach(tool => {
        const attachedIcon = tool.attached ? chalk.green('●') : chalk.gray('○');
        const enabledIcon = tool.enabled ? '' : chalk.gray(' (disabled)');
        console.log(`     ${attachedIcon} ${tool.name}${enabledIcon}`);
      });
    }
    console.log();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MCP Server Display
  // ─────────────────────────────────────────────────────────────────────────────

  printMCPServers(servers: Array<{ name: string; status: string; attached: boolean; description: string }>): void {
    this.printSectionHeader('MCP Servers', '🔌');
    
    const statusColors: Record<string, (s: string) => string> = {
      running: chalk.green,
      stopped: chalk.gray,
      starting: chalk.yellow,
      error: chalk.red,
    };

    servers.forEach(server => {
      const statusFn = statusColors[server.status] || chalk.white;
      const attachedIcon = server.attached ? chalk.green('●') : chalk.gray('○');
      console.log(
        `  ${attachedIcon} ${chalk.white(server.name.padEnd(25))} ` +
        `${statusFn(server.status.padEnd(10))} ` +
        `${chalk.gray(server.description)}`
      );
    });
    console.log();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Chat Display
  // ─────────────────────────────────────────────────────────────────────────────

  printChatMessage(role: string, content: string): void {
    const roleColors: Record<string, (s: string) => string> = {
      user: chalk.blue,
      assistant: chalk.green,
      system: chalk.gray,
      tool: chalk.yellow,
    };

    const roleIcons: Record<string, string> = {
      user: '👤',
      assistant: '🤖',
      system: '⚙️',
      tool: '🔧',
    };

    const colorFn = roleColors[role] || chalk.white;
    const icon = roleIcons[role] || '💬';

    console.log();
    console.log(colorFn(`${icon} ${role.toUpperCase()}`));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(content);
    console.log();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Help Display
  // ─────────────────────────────────────────────────────────────────────────────

  printHelp(): void {
    this.printHeader('SuperCode Help', 'Interactive AI Development Platform');

    console.log(chalk.cyan('🚀 Getting Started:'));
    console.log('  1. Use /model to view and attach local LLMs');
    console.log('  2. Use /chat to start a conversation');
    console.log('  3. Use /tools to see available tools');
    console.log('  4. Use /workflows to run multi-step automations');
    console.log();

    console.log(chalk.cyan('⌨️  Keyboard Shortcuts:'));
    console.log('  Ctrl+C  - Cancel current operation');
    console.log('  Ctrl+D  - Exit SuperCode');
    console.log('  Tab     - Auto-complete commands');
    console.log('  ↑/↓     - Navigate command history');
    console.log();

    console.log(chalk.cyan('💡 Tips:'));
    console.log('  • Type a command like /model to access that menu');
    console.log('  • Use /help <command> for detailed help on a command');
    console.log('  • Settings are auto-saved and persist between sessions');
    console.log('  • Use /debug to view logs and troubleshoot issues');
    console.log();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Dashboard
  // ─────────────────────────────────────────────────────────────────────────────

  printDashboard(data: {
    agents: { total: number; running: number };
    models: { total: number; attached: number };
    tools: { total: number; attached: number };
    mcp: { total: number; running: number };
    memory: { entries: number };
    tasks: { pending: number; completed: number };
  }): void {
    this.printHeader('Dashboard', 'System Overview');

    const dashboard = `
${chalk.cyan('🎯 Agents')}          ${chalk.cyan('🤖 Models')}          ${chalk.cyan('🔧 Tools')}
   Running: ${chalk.green(data.agents.running)}/${data.agents.total}      Attached: ${chalk.green(data.models.attached)}/${data.models.total}      Attached: ${chalk.green(data.tools.attached)}/${data.tools.total}

${chalk.cyan('🔌 MCP Servers')}     ${chalk.cyan('🧠 Memory')}          ${chalk.cyan('📋 Tasks')}
   Running: ${chalk.green(data.mcp.running)}/${data.mcp.total}      Entries: ${chalk.white(data.memory.entries)}       Pending: ${chalk.yellow(data.tasks.pending)}
                                           Completed: ${chalk.green(data.tasks.completed)}
`;

    console.log(boxen(dashboard, {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Prompt
  // ─────────────────────────────────────────────────────────────────────────────

  getPrompt(): string {
    return chalk.cyan('supercode') + chalk.gray(' > ');
  }

  printPrompt(): void {
    process.stdout.write(this.getPrompt());
  }
}

export const tui = new TUI();
export default tui;
