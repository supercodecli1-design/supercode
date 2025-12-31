// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Logger Utility
// ═══════════════════════════════════════════════════════════════════════════════

import chalk from 'chalk';
import type { LogLevel, LogEntry } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const LOG_COLORS: Record<LogLevel, (text: string) => string> = {
  debug: chalk.gray,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
  fatal: chalk.bgRed.white,
};

const LOG_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️ ',
  warn: '⚠️ ',
  error: '❌',
  fatal: '💀',
};

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private traceId?: string;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setTraceId(traceId: string): void {
    this.traceId = traceId;
  }

  clearTraceId(): void {
    this.traceId = undefined;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  private log(level: LogLevel, source: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      id: uuidv4(),
      level,
      source,
      message,
      data,
      timestamp: new Date(),
      traceId: this.traceId,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const timestamp = chalk.gray(this.formatTimestamp());
    const icon = LOG_ICONS[level];
    const levelStr = LOG_COLORS[level](level.toUpperCase().padEnd(5));
    const sourceStr = chalk.cyan(`[${source}]`);
    const messageStr = LOG_COLORS[level](message);

    console.log(`${timestamp} ${icon} ${levelStr} ${sourceStr} ${messageStr}`);
    
    if (data && level !== 'debug') {
      console.log(chalk.gray('   └─'), data);
    }
  }

  debug(source: string, message: string, data?: unknown): void {
    this.log('debug', source, message, data);
  }

  info(source: string, message: string, data?: unknown): void {
    this.log('info', source, message, data);
  }

  warn(source: string, message: string, data?: unknown): void {
    this.log('warn', source, message, data);
  }

  error(source: string, message: string, data?: unknown): void {
    this.log('error', source, message, data);
  }

  fatal(source: string, message: string, data?: unknown): void {
    this.log('fatal', source, message, data);
  }

  getLogs(options?: { level?: LogLevel; source?: string; limit?: number }): LogEntry[] {
    let filtered = [...this.logs];
    
    if (options?.level) {
      filtered = filtered.filter(l => l.level === options.level);
    }
    if (options?.source) {
      filtered = filtered.filter(l => l.source === options.source);
    }
    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }
    
    return filtered;
  }

  clearLogs(): void {
    this.logs = [];
  }

  // TOON-style formatted output
  box(title: string, content: string, color: 'green' | 'blue' | 'yellow' | 'red' | 'cyan' = 'cyan'): void {
    const colorFn = chalk[color];
    const width = Math.max(title.length, ...content.split('\n').map(l => l.length)) + 4;
    const border = colorFn('═'.repeat(width));
    
    console.log(colorFn(`╔${border}╗`));
    console.log(colorFn(`║ ${title.padEnd(width - 2)} ║`));
    console.log(colorFn(`╠${border}╣`));
    content.split('\n').forEach(line => {
      console.log(colorFn(`║ ${line.padEnd(width - 2)} ║`));
    });
    console.log(colorFn(`╚${border}╝`));
  }

  // Success message with icon
  success(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  // Progress indicator
  progress(current: number, total: number, label: string): void {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round(percentage / 5);
    const empty = 20 - filled;
    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    process.stdout.write(`\r${bar} ${percentage}% ${label}`);
    if (current === total) console.log();
  }
}

export const logger = Logger.getInstance();
export default logger;
