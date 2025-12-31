// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Todo Manager Agent
// Multi-file task & code planner with priority, reminders, auto-scheduling
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { TodoItem, TodoPriority, TodoStatus, PlannerTask } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export class TodoManagerAgent extends BaseAgent {
  private todos: Map<string, TodoItem> = new Map();
  private tasks: Map<string, PlannerTask> = new Map();
  private dbPath: string;
  private db: any;

  constructor() {
    super({ name: 'TodoManagerAgent', priority: 6 });
    this.dbPath = path.join(process.cwd(), '.voltagent', 'todos.db');
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '📋 Initializing Todo Manager Agent');
    
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    
    try {
      const Database = (await import('better-sqlite3')).default;
      this.db = new Database(this.dbPath);
      this.createTables();
      await this.loadTodos();
      logger.info(this.name, `Loaded ${this.todos.size} todos and ${this.tasks.size} tasks`);
    } catch (error) {
      logger.warn(this.name, 'SQLite not available, using in-memory storage');
      this.db = null;
    }

    // Start reminder checker
    this.startReminderChecker();
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down Todo Manager Agent');
    if (this.db) {
      this.db.close();
    }
  }

  protected async processTask(task: unknown): Promise<unknown> {
    const { action, ...params } = task as { action: string; [key: string]: unknown };
    
    switch (action) {
      case 'add':
        return this.addTodo(params as Partial<TodoItem>);
      case 'update':
        return this.updateTodo(params.id as string, params as Partial<TodoItem>);
      case 'delete':
        return this.deleteTodo(params.id as string);
      case 'list':
        return this.getTodos(params as { status?: TodoStatus; priority?: TodoPriority });
      case 'complete':
        return this.completeTodo(params.id as string);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private createTables(): void {
    if (!this.db) return;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        tags TEXT,
        files TEXT,
        due_date TEXT,
        reminder TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        parent_id TEXT,
        subtasks TEXT
      );
      
      CREATE TABLE IF NOT EXISTS planner_tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        files TEXT,
        dependencies TEXT,
        estimated_time INTEGER,
        actual_time INTEGER,
        status TEXT NOT NULL,
        priority TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
      CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
      CREATE INDEX IF NOT EXISTS idx_todos_due ON todos(due_date);
    `);
  }

  private async loadTodos(): Promise<void> {
    if (!this.db) return;
    
    const todoRows = this.db.prepare('SELECT * FROM todos').all();
    for (const row of todoRows) {
      this.todos.set(row.id, this.rowToTodo(row));
    }

    const taskRows = this.db.prepare('SELECT * FROM planner_tasks').all();
    for (const row of taskRows) {
      this.tasks.set(row.id, this.rowToTask(row));
    }
  }

  // Add a new todo
  async addTodo(item: Partial<TodoItem>): Promise<TodoItem> {
    const todo: TodoItem = {
      id: item.id || uuidv4(),
      title: item.title || 'Untitled',
      description: item.description,
      priority: item.priority || 'medium',
      status: item.status || 'pending',
      tags: item.tags || [],
      files: item.files,
      dueDate: item.dueDate,
      reminder: item.reminder,
      createdAt: new Date(),
      updatedAt: new Date(),
      parentId: item.parentId,
      subtasks: item.subtasks,
    };

    this.todos.set(todo.id, todo);
    this.saveTodo(todo);
    
    logger.info(this.name, `Added todo: ${todo.title}`);
    return todo;
  }

  // Update a todo
  async updateTodo(id: string, updates: Partial<TodoItem>): Promise<TodoItem | null> {
    const existing = this.todos.get(id);
    if (!existing) return null;

    const updated: TodoItem = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.todos.set(id, updated);
    this.saveTodo(updated);
    
    logger.info(this.name, `Updated todo: ${updated.title}`);
    return updated;
  }

  // Delete a todo
  async deleteTodo(id: string): Promise<boolean> {
    const deleted = this.todos.delete(id);
    
    if (this.db && deleted) {
      this.db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    }
    
    return deleted;
  }

  // Complete a todo
  async completeTodo(id: string): Promise<TodoItem | null> {
    return this.updateTodo(id, {
      status: 'completed',
      completedAt: new Date(),
    });
  }

  // Get todos with optional filters
  getTodos(filters?: { status?: TodoStatus; priority?: TodoPriority; tag?: string }): TodoItem[] {
    let results = Array.from(this.todos.values());
    
    if (filters?.status) {
      results = results.filter(t => t.status === filters.status);
    }
    if (filters?.priority) {
      results = results.filter(t => t.priority === filters.priority);
    }
    if (filters?.tag) {
      results = results.filter(t => t.tags.includes(filters.tag!));
    }
    
    // Sort by priority and due date
    const priorityOrder: Record<TodoPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    
    results.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      return a.dueDate ? -1 : b.dueDate ? 1 : 0;
    });
    
    return results;
  }

  // Get pending todos
  getPendingTodos(): TodoItem[] {
    return this.getTodos({ status: 'pending' });
  }

  // Get todos due today
  getTodayTodos(): TodoItem[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return Array.from(this.todos.values()).filter(t => {
      if (!t.dueDate) return false;
      return t.dueDate >= today && t.dueDate < tomorrow;
    });
  }

  // Get overdue todos
  getOverdueTodos(): TodoItem[] {
    const now = new Date();
    return Array.from(this.todos.values()).filter(t => {
      if (!t.dueDate || t.status === 'completed') return false;
      return t.dueDate < now;
    });
  }

  // Add a subtask
  async addSubtask(parentId: string, subtask: Partial<TodoItem>): Promise<TodoItem | null> {
    const parent = this.todos.get(parentId);
    if (!parent) return null;

    const newSubtask = await this.addTodo({
      ...subtask,
      parentId,
    });

    parent.subtasks = parent.subtasks || [];
    parent.subtasks.push(newSubtask.id);
    await this.updateTodo(parentId, { subtasks: parent.subtasks });

    return newSubtask;
  }

  // Get subtasks
  getSubtasks(parentId: string): TodoItem[] {
    const parent = this.todos.get(parentId);
    if (!parent?.subtasks) return [];
    
    return parent.subtasks
      .map(id => this.todos.get(id))
      .filter((t): t is TodoItem => t !== undefined);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Planner Tasks (Multi-file code planning)
  // ─────────────────────────────────────────────────────────────────────────────

  // Add a planner task
  async addPlannerTask(task: Partial<PlannerTask>): Promise<PlannerTask> {
    const plannerTask: PlannerTask = {
      id: task.id || uuidv4(),
      name: task.name || 'Untitled Task',
      type: task.type || 'code',
      files: task.files || [],
      dependencies: task.dependencies || [],
      estimatedTime: task.estimatedTime,
      status: task.status || 'pending',
      priority: task.priority || 'medium',
    };

    this.tasks.set(plannerTask.id, plannerTask);
    this.saveTask(plannerTask);
    
    logger.info(this.name, `Added planner task: ${plannerTask.name}`);
    return plannerTask;
  }

  // Update a planner task
  async updatePlannerTask(id: string, updates: Partial<PlannerTask>): Promise<PlannerTask | null> {
    const existing = this.tasks.get(id);
    if (!existing) return null;

    const updated: PlannerTask = {
      ...existing,
      ...updates,
      id,
    };

    this.tasks.set(id, updated);
    this.saveTask(updated);
    
    return updated;
  }

  // Get planner tasks
  getPlannerTasks(filters?: { type?: PlannerTask['type']; status?: TodoStatus }): PlannerTask[] {
    let results = Array.from(this.tasks.values());
    
    if (filters?.type) {
      results = results.filter(t => t.type === filters.type);
    }
    if (filters?.status) {
      results = results.filter(t => t.status === filters.status);
    }
    
    return results;
  }

  // Get tasks for a specific file
  getTasksForFile(filePath: string): PlannerTask[] {
    return Array.from(this.tasks.values()).filter(t => 
      t.files.includes(filePath)
    );
  }

  // Get task dependencies
  getTaskDependencies(taskId: string): PlannerTask[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];
    
    return task.dependencies
      .map(id => this.tasks.get(id))
      .filter((t): t is PlannerTask => t !== undefined);
  }

  // Get tasks that depend on a task
  getDependentTasks(taskId: string): PlannerTask[] {
    return Array.from(this.tasks.values()).filter(t => 
      t.dependencies.includes(taskId)
    );
  }

  // Auto-schedule tasks based on dependencies
  autoScheduleTasks(): PlannerTask[] {
    const scheduled: PlannerTask[] = [];
    const pending = new Set(
      Array.from(this.tasks.values())
        .filter(t => t.status === 'pending')
        .map(t => t.id)
    );

    while (pending.size > 0) {
      let foundReady = false;
      
      for (const taskId of pending) {
        const task = this.tasks.get(taskId)!;
        const depsComplete = task.dependencies.every(depId => {
          const dep = this.tasks.get(depId);
          return dep?.status === 'completed' || !pending.has(depId);
        });

        if (depsComplete) {
          scheduled.push(task);
          pending.delete(taskId);
          foundReady = true;
        }
      }

      if (!foundReady) {
        // Circular dependency or all remaining have unmet deps
        break;
      }
    }

    return scheduled;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Reminders
  // ─────────────────────────────────────────────────────────────────────────────

  private startReminderChecker(): void {
    setInterval(() => {
      this.checkReminders();
    }, 60000); // Check every minute
  }

  private checkReminders(): void {
    const now = new Date();
    
    for (const todo of this.todos.values()) {
      if (todo.reminder && todo.status !== 'completed') {
        if (todo.reminder <= now) {
          logger.info(this.name, `⏰ Reminder: ${todo.title}`);
          // Clear the reminder after triggering
          this.updateTodo(todo.id, { reminder: undefined });
        }
      }
    }
  }

  // Set a reminder
  async setReminder(todoId: string, reminderTime: Date): Promise<boolean> {
    const todo = this.todos.get(todoId);
    if (!todo) return false;
    
    await this.updateTodo(todoId, { reminder: reminderTime });
    logger.info(this.name, `Set reminder for "${todo.title}" at ${reminderTime.toISOString()}`);
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Statistics
  // ─────────────────────────────────────────────────────────────────────────────

  getStats(): {
    total: number;
    byStatus: Record<TodoStatus, number>;
    byPriority: Record<TodoPriority, number>;
    overdue: number;
    dueToday: number;
    completedToday: number;
  } {
    const todos = Array.from(this.todos.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const byStatus: Record<TodoStatus, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    const byPriority: Record<TodoPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let overdue = 0;
    let dueToday = 0;
    let completedToday = 0;

    for (const todo of todos) {
      byStatus[todo.status]++;
      byPriority[todo.priority]++;

      if (todo.dueDate && todo.status !== 'completed') {
        if (todo.dueDate < today) overdue++;
        else if (todo.dueDate < tomorrow) dueToday++;
      }

      if (todo.completedAt && todo.completedAt >= today && todo.completedAt < tomorrow) {
        completedToday++;
      }
    }

    return {
      total: todos.length,
      byStatus,
      byPriority,
      overdue,
      dueToday,
      completedToday,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Persistence helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private saveTodo(todo: TodoItem): void {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO todos 
      (id, title, description, priority, status, tags, files, due_date, reminder, 
       created_at, updated_at, completed_at, parent_id, subtasks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      todo.id,
      todo.title,
      todo.description || null,
      todo.priority,
      todo.status,
      JSON.stringify(todo.tags),
      todo.files ? JSON.stringify(todo.files) : null,
      todo.dueDate?.toISOString() || null,
      todo.reminder?.toISOString() || null,
      todo.createdAt.toISOString(),
      todo.updatedAt.toISOString(),
      todo.completedAt?.toISOString() || null,
      todo.parentId || null,
      todo.subtasks ? JSON.stringify(todo.subtasks) : null
    );
  }

  private saveTask(task: PlannerTask): void {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO planner_tasks 
      (id, name, type, files, dependencies, estimated_time, actual_time, status, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      task.id,
      task.name,
      task.type,
      JSON.stringify(task.files),
      JSON.stringify(task.dependencies),
      task.estimatedTime || null,
      task.actualTime || null,
      task.status,
      task.priority
    );
  }

  private rowToTodo(row: any): TodoItem {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      tags: row.tags ? JSON.parse(row.tags) : [],
      files: row.files ? JSON.parse(row.files) : undefined,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      reminder: row.reminder ? new Date(row.reminder) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      parentId: row.parent_id,
      subtasks: row.subtasks ? JSON.parse(row.subtasks) : undefined,
    };
  }

  private rowToTask(row: any): PlannerTask {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      files: row.files ? JSON.parse(row.files) : [],
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
      estimatedTime: row.estimated_time,
      actualTime: row.actual_time,
      status: row.status,
      priority: row.priority,
    };
  }
}

export default TodoManagerAgent;
