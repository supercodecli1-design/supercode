// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Functions Agent
// Manage 100+ functions dynamically with inline execution & validation
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { FunctionDefinition } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

interface FunctionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime: number;
}

export class FunctionsAgent extends BaseAgent {
  private functions: Map<string, FunctionDefinition> = new Map();
  private categories: Set<string> = new Set();

  constructor() {
    super({ name: 'FunctionsAgent', priority: 8 });
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '⚡ Initializing Functions Agent');
    await this.loadBuiltInFunctions();
    logger.info(this.name, `Loaded ${this.functions.size} functions`);
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down Functions Agent');
    this.functions.clear();
  }

  protected async processTask(task: unknown): Promise<unknown> {
    const { action, functionId, input } = task as { action: string; functionId?: string; input?: unknown };
    
    switch (action) {
      case 'execute':
        if (!functionId) throw new Error('Function ID required');
        return this.executeFunction(functionId, input);
      case 'list':
        return this.getFunctions();
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async loadBuiltInFunctions(): Promise<void> {
    // String Functions
    this.registerFunction({
      id: 'string-uppercase',
      name: 'To Uppercase',
      description: 'Convert string to uppercase',
      category: 'string',
      attached: true,
      enabled: true,
      inputSchema: z.object({ text: z.string() }),
      outputSchema: z.string(),
      execute: async (input) => {
        const { text } = input as { text: string };
        return text.toUpperCase();
      },
    });

    this.registerFunction({
      id: 'string-lowercase',
      name: 'To Lowercase',
      description: 'Convert string to lowercase',
      category: 'string',
      attached: true,
      enabled: true,
      inputSchema: z.object({ text: z.string() }),
      outputSchema: z.string(),
      execute: async (input) => {
        const { text } = input as { text: string };
        return text.toLowerCase();
      },
    });

    this.registerFunction({
      id: 'string-trim',
      name: 'Trim String',
      description: 'Remove whitespace from both ends',
      category: 'string',
      attached: true,
      enabled: true,
      inputSchema: z.object({ text: z.string() }),
      outputSchema: z.string(),
      execute: async (input) => {
        const { text } = input as { text: string };
        return text.trim();
      },
    });

    this.registerFunction({
      id: 'string-split',
      name: 'Split String',
      description: 'Split string by delimiter',
      category: 'string',
      attached: true,
      enabled: true,
      inputSchema: z.object({ text: z.string(), delimiter: z.string().default(',') }),
      outputSchema: z.array(z.string()),
      execute: async (input) => {
        const { text, delimiter } = input as { text: string; delimiter: string };
        return text.split(delimiter);
      },
    });

    this.registerFunction({
      id: 'string-join',
      name: 'Join Strings',
      description: 'Join array of strings',
      category: 'string',
      attached: true,
      enabled: true,
      inputSchema: z.object({ items: z.array(z.string()), delimiter: z.string().default(',') }),
      outputSchema: z.string(),
      execute: async (input) => {
        const { items, delimiter } = input as { items: string[]; delimiter: string };
        return items.join(delimiter);
      },
    });

    this.registerFunction({
      id: 'string-replace',
      name: 'Replace String',
      description: 'Replace occurrences in string',
      category: 'string',
      attached: true,
      enabled: true,
      inputSchema: z.object({ text: z.string(), search: z.string(), replace: z.string() }),
      outputSchema: z.string(),
      execute: async (input) => {
        const { text, search, replace } = input as { text: string; search: string; replace: string };
        return text.replaceAll(search, replace);
      },
    });

    // Math Functions
    this.registerFunction({
      id: 'math-add',
      name: 'Add Numbers',
      description: 'Add two or more numbers',
      category: 'math',
      attached: true,
      enabled: true,
      inputSchema: z.object({ numbers: z.array(z.number()) }),
      outputSchema: z.number(),
      execute: async (input) => {
        const { numbers } = input as { numbers: number[] };
        return numbers.reduce((a, b) => a + b, 0);
      },
    });

    this.registerFunction({
      id: 'math-multiply',
      name: 'Multiply Numbers',
      description: 'Multiply two or more numbers',
      category: 'math',
      attached: true,
      enabled: true,
      inputSchema: z.object({ numbers: z.array(z.number()) }),
      outputSchema: z.number(),
      execute: async (input) => {
        const { numbers } = input as { numbers: number[] };
        return numbers.reduce((a, b) => a * b, 1);
      },
    });

    this.registerFunction({
      id: 'math-average',
      name: 'Calculate Average',
      description: 'Calculate average of numbers',
      category: 'math',
      attached: true,
      enabled: true,
      inputSchema: z.object({ numbers: z.array(z.number()) }),
      outputSchema: z.number(),
      execute: async (input) => {
        const { numbers } = input as { numbers: number[] };
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
      },
    });

    this.registerFunction({
      id: 'math-round',
      name: 'Round Number',
      description: 'Round number to decimal places',
      category: 'math',
      attached: true,
      enabled: true,
      inputSchema: z.object({ number: z.number(), decimals: z.number().default(0) }),
      outputSchema: z.number(),
      execute: async (input) => {
        const { number, decimals } = input as { number: number; decimals: number };
        const factor = Math.pow(10, decimals);
        return Math.round(number * factor) / factor;
      },
    });

    // Array Functions
    this.registerFunction({
      id: 'array-sort',
      name: 'Sort Array',
      description: 'Sort array elements',
      category: 'array',
      attached: true,
      enabled: true,
      inputSchema: z.object({ items: z.array(z.any()), reverse: z.boolean().default(false) }),
      outputSchema: z.array(z.any()),
      execute: async (input) => {
        const { items, reverse } = input as { items: unknown[]; reverse: boolean };
        const sorted = [...items].sort();
        return reverse ? sorted.reverse() : sorted;
      },
    });

    this.registerFunction({
      id: 'array-unique',
      name: 'Unique Array',
      description: 'Remove duplicate elements',
      category: 'array',
      attached: true,
      enabled: true,
      inputSchema: z.object({ items: z.array(z.any()) }),
      outputSchema: z.array(z.any()),
      execute: async (input) => {
        const { items } = input as { items: unknown[] };
        return [...new Set(items)];
      },
    });

    this.registerFunction({
      id: 'array-filter',
      name: 'Filter Array',
      description: 'Filter array by condition',
      category: 'array',
      attached: true,
      enabled: true,
      inputSchema: z.object({ items: z.array(z.any()), condition: z.string() }),
      outputSchema: z.array(z.any()),
      execute: async (input) => {
        const { items, condition } = input as { items: unknown[]; condition: string };
        const fn = new Function('item', `return ${condition}`);
        return items.filter(item => fn(item));
      },
    });

    this.registerFunction({
      id: 'array-map',
      name: 'Map Array',
      description: 'Transform array elements',
      category: 'array',
      attached: true,
      enabled: true,
      inputSchema: z.object({ items: z.array(z.any()), transform: z.string() }),
      outputSchema: z.array(z.any()),
      execute: async (input) => {
        const { items, transform } = input as { items: unknown[]; transform: string };
        const fn = new Function('item', `return ${transform}`);
        return items.map(item => fn(item));
      },
    });

    // Object Functions
    this.registerFunction({
      id: 'object-keys',
      name: 'Get Object Keys',
      description: 'Get all keys from object',
      category: 'object',
      attached: true,
      enabled: true,
      inputSchema: z.object({ obj: z.record(z.any()) }),
      outputSchema: z.array(z.string()),
      execute: async (input) => {
        const { obj } = input as { obj: Record<string, unknown> };
        return Object.keys(obj);
      },
    });

    this.registerFunction({
      id: 'object-values',
      name: 'Get Object Values',
      description: 'Get all values from object',
      category: 'object',
      attached: true,
      enabled: true,
      inputSchema: z.object({ obj: z.record(z.any()) }),
      outputSchema: z.array(z.any()),
      execute: async (input) => {
        const { obj } = input as { obj: Record<string, unknown> };
        return Object.values(obj);
      },
    });

    this.registerFunction({
      id: 'object-merge',
      name: 'Merge Objects',
      description: 'Merge multiple objects',
      category: 'object',
      attached: true,
      enabled: true,
      inputSchema: z.object({ objects: z.array(z.record(z.any())) }),
      outputSchema: z.record(z.any()),
      execute: async (input) => {
        const { objects } = input as { objects: Record<string, unknown>[] };
        return Object.assign({}, ...objects);
      },
    });

    // Date Functions
    this.registerFunction({
      id: 'date-format',
      name: 'Format Date',
      description: 'Format date to string',
      category: 'date',
      attached: true,
      enabled: true,
      inputSchema: z.object({ date: z.string().optional(), format: z.string().default('iso') }),
      outputSchema: z.string(),
      execute: async (input) => {
        const { date, format } = input as { date?: string; format: string };
        const d = date ? new Date(date) : new Date();
        switch (format) {
          case 'iso': return d.toISOString();
          case 'date': return d.toDateString();
          case 'time': return d.toTimeString();
          case 'locale': return d.toLocaleString();
          default: return d.toISOString();
        }
      },
    });

    this.registerFunction({
      id: 'date-diff',
      name: 'Date Difference',
      description: 'Calculate difference between dates',
      category: 'date',
      attached: true,
      enabled: true,
      inputSchema: z.object({ date1: z.string(), date2: z.string(), unit: z.string().default('days') }),
      outputSchema: z.number(),
      execute: async (input) => {
        const { date1, date2, unit } = input as { date1: string; date2: string; unit: string };
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffMs = Math.abs(d2.getTime() - d1.getTime());
        switch (unit) {
          case 'seconds': return Math.floor(diffMs / 1000);
          case 'minutes': return Math.floor(diffMs / (1000 * 60));
          case 'hours': return Math.floor(diffMs / (1000 * 60 * 60));
          case 'days': return Math.floor(diffMs / (1000 * 60 * 60 * 24));
          default: return diffMs;
        }
      },
    });

    // Encoding Functions
    this.registerFunction({
      id: 'encode-base64',
      name: 'Base64 Encode',
      description: 'Encode string to base64',
      category: 'encoding',
      attached: true,
      enabled: true,
      inputSchema: z.object({ text: z.string() }),
      outputSchema: z.string(),
      execute: async (input) => {
        const { text } = input as { text: string };
        return Buffer.from(text).toString('base64');
      },
    });

    this.registerFunction({
      id: 'decode-base64',
      name: 'Base64 Decode',
      description: 'Decode base64 to string',
      category: 'encoding',
      attached: true,
      enabled: true,
      inputSchema: z.object({ encoded: z.string() }),
      outputSchema: z.string(),
      execute: async (input) => {
        const { encoded } = input as { encoded: string };
        return Buffer.from(encoded, 'base64').toString('utf-8');
      },
    });

    this.registerFunction({
      id: 'encode-url',
      name: 'URL Encode',
      description: 'Encode string for URL',
      category: 'encoding',
      attached: true,
      enabled: true,
      inputSchema: z.object({ text: z.string() }),
      outputSchema: z.string(),
      execute: async (input) => {
        const { text } = input as { text: string };
        return encodeURIComponent(text);
      },
    });

    this.registerFunction({
      id: 'decode-url',
      name: 'URL Decode',
      description: 'Decode URL encoded string',
      category: 'encoding',
      attached: true,
      enabled: true,
      inputSchema: z.object({ encoded: z.string() }),
      outputSchema: z.string(),
      execute: async (input) => {
        const { encoded } = input as { encoded: string };
        return decodeURIComponent(encoded);
      },
    });

    // Validation Functions
    this.registerFunction({
      id: 'validate-email',
      name: 'Validate Email',
      description: 'Check if string is valid email',
      category: 'validation',
      attached: true,
      enabled: true,
      inputSchema: z.object({ email: z.string() }),
      outputSchema: z.boolean(),
      execute: async (input) => {
        const { email } = input as { email: string };
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
      },
    });

    this.registerFunction({
      id: 'validate-url',
      name: 'Validate URL',
      description: 'Check if string is valid URL',
      category: 'validation',
      attached: true,
      enabled: true,
      inputSchema: z.object({ url: z.string() }),
      outputSchema: z.boolean(),
      execute: async (input) => {
        const { url } = input as { url: string };
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
    });

    this.registerFunction({
      id: 'validate-json',
      name: 'Validate JSON',
      description: 'Check if string is valid JSON',
      category: 'validation',
      attached: true,
      enabled: true,
      inputSchema: z.object({ json: z.string() }),
      outputSchema: z.boolean(),
      execute: async (input) => {
        const { json } = input as { json: string };
        try {
          JSON.parse(json);
          return true;
        } catch {
          return false;
        }
      },
    });
  }

  registerFunction(fn: FunctionDefinition): void {
    this.functions.set(fn.id, fn);
    this.categories.add(fn.category);
    logger.debug(this.name, `Registered function: ${fn.name}`);
  }

  async executeFunction(functionId: string, input: unknown): Promise<FunctionResult> {
    const fn = this.functions.get(functionId);
    
    if (!fn) {
      return { success: false, error: `Function not found: ${functionId}`, executionTime: 0 };
    }
    
    if (!fn.attached || !fn.enabled) {
      return { success: false, error: `Function not available: ${functionId}`, executionTime: 0 };
    }

    const start = Date.now();
    this.taskStarted();

    try {
      // Validate input
      const validatedInput = fn.inputSchema.parse(input);
      
      // Execute function
      const result = await fn.execute(validatedInput);
      
      // Validate output
      fn.outputSchema.parse(result);
      
      this.taskCompleted();
      return { success: true, data: result, executionTime: Date.now() - start };
    } catch (error) {
      this.taskFailed();
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - start,
      };
    }
  }

  attachFunction(functionId: string): boolean {
    const fn = this.functions.get(functionId);
    if (fn) {
      fn.attached = true;
      return true;
    }
    return false;
  }

  detachFunction(functionId: string): boolean {
    const fn = this.functions.get(functionId);
    if (fn) {
      fn.attached = false;
      return true;
    }
    return false;
  }

  getFunctions(): FunctionDefinition[] {
    return Array.from(this.functions.values());
  }

  getAttachedFunctions(): FunctionDefinition[] {
    return Array.from(this.functions.values()).filter(f => f.attached);
  }

  getFunctionsByCategory(category: string): FunctionDefinition[] {
    return Array.from(this.functions.values()).filter(f => f.category === category);
  }

  getCategories(): string[] {
    return Array.from(this.categories);
  }

  getFunction(functionId: string): FunctionDefinition | undefined {
    return this.functions.get(functionId);
  }

  searchFunctions(query: string): FunctionDefinition[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.functions.values()).filter(f =>
      f.name.toLowerCase().includes(lowerQuery) ||
      f.description.toLowerCase().includes(lowerQuery)
    );
  }
}

export default FunctionsAgent;
