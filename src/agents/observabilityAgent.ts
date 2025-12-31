// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Observability Agent
// Logging, metrics, error forwarding, retry, fullStream
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { LogEntry, LogLevel, MetricEntry, ErrorEvent } from '../types/index.js';
import { eventBus } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export class ObservabilityAgent extends BaseAgent {
  private logs: LogEntry[] = [];
  private metricsData: Map<string, MetricEntry[]> = new Map();
  private errors: Map<string, ErrorEvent> = new Map();
  private dbPath: string;
  private db: any;
  private maxLogs = 10000;
  private maxMetricsPerName = 1000;
  private retryQueue: Array<{ fn: () => Promise<unknown>; retries: number; maxRetries: number }> = [];

  constructor() {
    super({ name: 'ObservabilityAgent', priority: 9 });
    this.dbPath = path.join(process.cwd(), '.voltagent', 'observability.db');
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '📊 Initializing Observability Agent');
    
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    
    try {
      const Database = (await import('better-sqlite3')).default;
      this.db = new Database(this.dbPath);
      this.createTables();
      logger.info(this.name, 'Observability database initialized');
    } catch (error) {
      logger.warn(this.name, 'SQLite not available, using in-memory storage');
      this.db = null;
    }

    // Subscribe to all events for logging
    eventBus.onAllEvents((event) => {
      this.logEvent(event);
    });

    // Start retry processor
    this.startRetryProcessor();
    
    // Start metrics aggregator
    this.startMetricsAggregator();
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down Observability Agent');
    if (this.db) {
      this.db.close();
    }
  }

  protected async processTask(task: unknown): Promise<unknown> {
    const { action, ...params } = task as { action: string; [key: string]: unknown };
    
    switch (action) {
      case 'log':
        return this.log(params as Partial<LogEntry>);
      case 'metric':
        return this.recordMetric(params as Partial<MetricEntry>);
      case 'error':
        return this.recordError(params as Partial<ErrorEvent>);
      case 'getLogs':
        return this.getLogs(params as { level?: LogLevel; source?: string; limit?: number });
      case 'getMetrics':
        return this.getMetricsData(params.name as string);
      case 'getErrors':
        return this.getErrors(params as { resolved?: boolean });
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private createTables(): void {
    if (!this.db) return;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        source TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        timestamp TEXT NOT NULL,
        trace_id TEXT
      );
      
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value REAL NOT NULL,
        type TEXT NOT NULL,
        labels TEXT,
        timestamp TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS errors (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        error TEXT NOT NULL,
        stack TEXT,
        context TEXT,
        timestamp TEXT NOT NULL,
        resolved INTEGER DEFAULT 0,
        retry_count INTEGER DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
      CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(name);
      CREATE INDEX IF NOT EXISTS idx_errors_resolved ON errors(resolved);
    `);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Logging
  // ─────────────────────────────────────────────────────────────────────────────

  log(entry: Partial<LogEntry>): LogEntry {
    const logEntry: LogEntry = {
      id: entry.id || uuidv4(),
      level: entry.level || 'info',
      source: entry.source || 'unknown',
      message: entry.message || '',
      data: entry.data,
      timestamp: entry.timestamp || new Date(),
      traceId: entry.traceId,
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.saveLog(logEntry);
    return logEntry;
  }

  private logEvent(event: unknown): void {
    const e = event as { type: string; [key: string]: unknown };
    this.log({
      level: 'debug',
      source: 'EventBus',
      message: `Event: ${e.type}`,
      data: event,
    });
  }

  getLogs(options?: { level?: LogLevel; source?: string; limit?: number; startDate?: Date; endDate?: Date }): LogEntry[] {
    let results = [...this.logs];
    
    if (options?.level) {
      results = results.filter(l => l.level === options.level);
    }
    if (options?.source) {
      results = results.filter(l => l.source === options.source);
    }
    if (options?.startDate) {
      results = results.filter(l => l.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      results = results.filter(l => l.timestamp <= options.endDate!);
    }
    if (options?.limit) {
      results = results.slice(-options.limit);
    }
    
    return results;
  }

  clearLogs(): void {
    this.logs = [];
    if (this.db) {
      this.db.prepare('DELETE FROM logs').run();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Metrics
  // ─────────────────────────────────────────────────────────────────────────────

  recordMetric(metric: Partial<MetricEntry>): MetricEntry {
    const entry: MetricEntry = {
      name: metric.name || 'unknown',
      value: metric.value || 0,
      type: metric.type || 'gauge',
      labels: metric.labels || {},
      timestamp: metric.timestamp || new Date(),
    };

    if (!this.metricsData.has(entry.name)) {
      this.metricsData.set(entry.name, []);
    }
    
    const metricList = this.metricsData.get(entry.name)!;
    metricList.push(entry);
    
    if (metricList.length > this.maxMetricsPerName) {
      metricList.shift();
    }

    this.saveMetric(entry);
    return entry;
  }

  // Increment a counter
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.recordMetric({ name, value, type: 'counter', labels });
  }

  // Set a gauge value
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric({ name, value, type: 'gauge', labels });
  }

  // Record a histogram value
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric({ name, value, type: 'histogram', labels });
  }

  getMetricsData(name: string): MetricEntry[] {
    return this.metricsData.get(name) || [];
  }

  getAllMetricNames(): string[] {
    return Array.from(this.metricsData.keys());
  }

  getMetricsSummary(name: string): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    latest: number;
  } | null {
    const entries = this.metricsData.get(name) as MetricEntry[] | undefined;
    if (!entries || entries.length === 0) return null;

    const values = entries.map(e => e.value);
    return {
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Tracking
  // ─────────────────────────────────────────────────────────────────────────────

  recordError(error: Partial<ErrorEvent>): ErrorEvent {
    const errorEvent: ErrorEvent = {
      id: error.id || uuidv4(),
      source: error.source || 'unknown',
      error: error.error || 'Unknown error',
      stack: error.stack,
      context: error.context,
      timestamp: error.timestamp || new Date(),
      resolved: error.resolved || false,
      retryCount: error.retryCount || 0,
    };

    this.errors.set(errorEvent.id, errorEvent);
    this.saveError(errorEvent);
    
    logger.error(this.name, `Error recorded: ${errorEvent.error}`, errorEvent);
    return errorEvent;
  }

  getErrors(options?: { resolved?: boolean; source?: string }): ErrorEvent[] {
    let results = Array.from(this.errors.values());
    
    if (options?.resolved !== undefined) {
      results = results.filter(e => e.resolved === options.resolved);
    }
    if (options?.source) {
      results = results.filter(e => e.source === options.source);
    }
    
    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  resolveError(errorId: string): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;
    
    error.resolved = true;
    this.saveError(error);
    return true;
  }

  getUnresolvedErrors(): ErrorEvent[] {
    return this.getErrors({ resolved: false });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Retry Logic
  // ─────────────────────────────────────────────────────────────────────────────

  async withRetry<T>(
    fn: () => Promise<T>,
    options: { maxRetries?: number; delay?: number; backoff?: number } = {}
  ): Promise<T> {
    const { maxRetries = 3, delay = 1000, backoff = 2 } = options;
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          const waitTime = delay * Math.pow(backoff, attempt);
          logger.warn(this.name, `Retry ${attempt + 1}/${maxRetries} after ${waitTime}ms`, { error: lastError.message });
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    this.recordError({
      source: 'RetryHandler',
      error: lastError?.message || 'Unknown error',
      stack: lastError?.stack,
      context: { maxRetries },
    });
    
    throw lastError;
  }

  queueForRetry(fn: () => Promise<unknown>, maxRetries: number = 3): void {
    this.retryQueue.push({ fn, retries: 0, maxRetries });
  }

  private startRetryProcessor(): void {
    setInterval(async () => {
      if (this.retryQueue.length === 0) return;
      
      const item = this.retryQueue.shift();
      if (!item) return;
      
      try {
        await item.fn();
      } catch (error) {
        item.retries++;
        if (item.retries < item.maxRetries) {
          this.retryQueue.push(item);
        } else {
          this.recordError({
            source: 'RetryQueue',
            error: error instanceof Error ? error.message : String(error),
            context: { retries: item.retries },
          });
        }
      }
    }, 5000);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Metrics Aggregation
  // ─────────────────────────────────────────────────────────────────────────────

  private startMetricsAggregator(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const os = await import('os');
      
      this.setGauge('system.memory.used', os.totalmem() - os.freemem());
      this.setGauge('system.memory.free', os.freemem());
      this.setGauge('system.memory.total', os.totalmem());
      this.setGauge('system.cpu.count', os.cpus().length);
      this.setGauge('system.uptime', os.uptime());
      
      const loadAvg = os.loadavg();
      this.setGauge('system.load.1m', loadAvg[0]);
      this.setGauge('system.load.5m', loadAvg[1]);
      this.setGauge('system.load.15m', loadAvg[2]);
    } catch (error) {
      // Ignore errors in metrics collection
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Dashboard Data
  // ─────────────────────────────────────────────────────────────────────────────

  getDashboardData(): {
    logs: { total: number; byLevel: Record<LogLevel, number> };
    metrics: { names: string[]; summaries: Record<string, { count: number; sum: number; avg: number; min: number; max: number; latest: number } | null> };
    errors: { total: number; unresolved: number; recent: ErrorEvent[] };
  } {
    const logsByLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };
    
    for (const log of this.logs) {
      logsByLevel[log.level]++;
    }

    const metricNames = this.getAllMetricNames();
    const summaries: Record<string, { count: number; sum: number; avg: number; min: number; max: number; latest: number } | null> = {};
    for (const name of metricNames) {
      summaries[name] = this.getMetricsSummary(name);
    }

    const allErrors = Array.from(this.errors.values());
    
    return {
      logs: {
        total: this.logs.length,
        byLevel: logsByLevel,
      },
      metrics: {
        names: metricNames,
        summaries,
      },
      errors: {
        total: allErrors.length,
        unresolved: allErrors.filter(e => !e.resolved).length,
        recent: allErrors.slice(-10),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Export
  // ─────────────────────────────────────────────────────────────────────────────

  async exportLogs(filePath: string): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(this.logs, null, 2));
    logger.info(this.name, `Exported ${this.logs.length} logs to ${filePath}`);
  }

  async exportMetrics(filePath: string): Promise<void> {
    const data: Record<string, MetricEntry[]> = {};
    for (const [name, entries] of this.metricsData) {
      data[name] = entries;
    }
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    logger.info(this.name, `Exported metrics to ${filePath}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────────────────

  private saveLog(entry: LogEntry): void {
    if (!this.db) return;
    
    this.db.prepare(`
      INSERT INTO logs (id, level, source, message, data, timestamp, trace_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.level,
      entry.source,
      entry.message,
      entry.data ? JSON.stringify(entry.data) : null,
      entry.timestamp.toISOString(),
      entry.traceId || null
    );
  }

  private saveMetric(entry: MetricEntry): void {
    if (!this.db) return;
    
    this.db.prepare(`
      INSERT INTO metrics (name, value, type, labels, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      entry.name,
      entry.value,
      entry.type,
      JSON.stringify(entry.labels),
      entry.timestamp.toISOString()
    );
  }

  private saveError(error: ErrorEvent): void {
    if (!this.db) return;
    
    this.db.prepare(`
      INSERT OR REPLACE INTO errors (id, source, error, stack, context, timestamp, resolved, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      error.id,
      error.source,
      error.error,
      error.stack || null,
      error.context ? JSON.stringify(error.context) : null,
      error.timestamp.toISOString(),
      error.resolved ? 1 : 0,
      error.retryCount
    );
  }
}

export default ObservabilityAgent;
