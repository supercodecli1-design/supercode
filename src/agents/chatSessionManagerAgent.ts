// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Chat Session Manager Agent
// Save/load/export/import chats, merge & split sessions
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { ChatSession, ChatMessage, ChatRole } from '../types/index.js';
import { eventBus } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export class ChatSessionManagerAgent extends BaseAgent {
  private sessions: Map<string, ChatSession> = new Map();
  private activeSessionId: string | null = null;
  private dbPath: string;
  private db: any;

  constructor() {
    super({ name: 'ChatSessionManagerAgent', priority: 5 });
    this.dbPath = path.join(process.cwd(), '.voltagent', 'chats.db');
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '💬 Initializing Chat Session Manager Agent');
    
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    
    try {
      const Database = (await import('better-sqlite3')).default;
      this.db = new Database(this.dbPath);
      this.createTables();
      await this.loadSessions();
      logger.info(this.name, `Loaded ${this.sessions.size} chat sessions`);
    } catch (error) {
      logger.warn(this.name, 'SQLite not available, using in-memory storage');
      this.db = null;
    }
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down Chat Session Manager Agent');
    if (this.db) {
      this.db.close();
    }
  }

  protected async processTask(task: unknown): Promise<unknown> {
    const { action, ...params } = task as { action: string; [key: string]: unknown };
    
    switch (action) {
      case 'create':
        return this.createSession(params.name as string, params.modelId as string);
      case 'addMessage':
        return this.addMessage(params.sessionId as string, params.message as Partial<ChatMessage>);
      case 'list':
        return this.getSessions();
      case 'get':
        return this.getSession(params.sessionId as string);
      case 'delete':
        return this.deleteSession(params.sessionId as string);
      case 'export':
        return this.exportSession(params.sessionId as string, params.format as 'json' | 'markdown' | 'text');
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private createTables(): void {
    if (!this.db) return;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        model_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        metadata TEXT,
        tool_calls TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    `);
  }

  private async loadSessions(): Promise<void> {
    if (!this.db) return;
    
    const sessionRows = this.db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all();
    
    for (const row of sessionRows) {
      const messages = this.db.prepare(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
      ).all(row.id);
      
      this.sessions.set(row.id, {
        id: row.id,
        name: row.name,
        modelId: row.model_id,
        messages: messages.map((m: any) => ({
          id: m.id,
          role: m.role as ChatRole,
          content: m.content,
          timestamp: new Date(m.timestamp),
          metadata: m.metadata ? JSON.parse(m.metadata) : undefined,
          toolCalls: m.tool_calls ? JSON.parse(m.tool_calls) : undefined,
        })),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
      });
    }
  }

  // Create a new session
  async createSession(name?: string, modelId?: string): Promise<ChatSession> {
    const session: ChatSession = {
      id: uuidv4(),
      name: name || `Chat ${this.sessions.size + 1}`,
      modelId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;
    this.saveSession(session);
    
    logger.info(this.name, `Created session: ${session.name}`);
    return session;
  }

  // Add a message to a session
  async addMessage(sessionId: string, message: Partial<ChatMessage>): Promise<ChatMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const chatMessage: ChatMessage = {
      id: message.id || uuidv4(),
      role: message.role || 'user',
      content: message.content || '',
      timestamp: message.timestamp || new Date(),
      metadata: message.metadata,
      toolCalls: message.toolCalls,
    };

    session.messages.push(chatMessage);
    session.updatedAt = new Date();
    
    this.saveMessage(sessionId, chatMessage);
    this.updateSessionTimestamp(sessionId);
    
    eventBus.emitEvent({ type: 'chat:message', sessionId, messageId: chatMessage.id });
    
    return chatMessage;
  }

  // Get a session by ID
  getSession(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) || null;
  }

  // Get all sessions
  getSessions(): ChatSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Get active session
  getActiveSession(): ChatSession | null {
    return this.activeSessionId ? this.sessions.get(this.activeSessionId) || null : null;
  }

  // Set active session
  setActiveSession(sessionId: string): boolean {
    if (this.sessions.has(sessionId)) {
      this.activeSessionId = sessionId;
      return true;
    }
    return false;
  }

  // Delete a session
  async deleteSession(sessionId: string): Promise<boolean> {
    const deleted = this.sessions.delete(sessionId);
    
    if (this.db && deleted) {
      this.db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
      this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    }

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
    
    return deleted;
  }

  // Rename a session
  async renameSession(sessionId: string, newName: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    session.name = newName;
    session.updatedAt = new Date();
    this.saveSession(session);
    
    return true;
  }

  // Search sessions
  searchSessions(query: string): ChatSession[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.sessions.values()).filter(session =>
      session.name.toLowerCase().includes(lowerQuery) ||
      session.messages.some(m => m.content.toLowerCase().includes(lowerQuery))
    );
  }

  // Search messages across all sessions
  searchMessages(query: string): Array<{ session: ChatSession; message: ChatMessage }> {
    const results: Array<{ session: ChatSession; message: ChatMessage }> = [];
    const lowerQuery = query.toLowerCase();
    
    for (const session of this.sessions.values()) {
      for (const message of session.messages) {
        if (message.content.toLowerCase().includes(lowerQuery)) {
          results.push({ session, message });
        }
      }
    }
    
    return results;
  }

  // Export session to various formats
  async exportSession(sessionId: string, format: 'json' | 'markdown' | 'text' = 'json'): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(session, null, 2);
      
      case 'markdown':
        return this.sessionToMarkdown(session);
      
      case 'text':
        return this.sessionToText(session);
      
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  // Export session to file
  async exportToFile(sessionId: string, filePath: string, format: 'json' | 'markdown' | 'text' = 'json'): Promise<void> {
    const content = await this.exportSession(sessionId, format);
    await fs.writeFile(filePath, content);
    logger.info(this.name, `Exported session to ${filePath}`);
  }

  // Import session from JSON
  async importSession(jsonContent: string): Promise<ChatSession> {
    const data = JSON.parse(jsonContent);
    
    const session: ChatSession = {
      id: uuidv4(), // Generate new ID
      name: data.name || 'Imported Session',
      modelId: data.modelId,
      messages: (data.messages || []).map((m: any) => ({
        id: m.id || uuidv4(),
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        metadata: m.metadata,
        toolCalls: m.toolCalls,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: data.metadata || {},
    };

    this.sessions.set(session.id, session);
    this.saveSession(session);
    
    for (const message of session.messages) {
      this.saveMessage(session.id, message);
    }
    
    logger.info(this.name, `Imported session: ${session.name}`);
    return session;
  }

  // Import session from file
  async importFromFile(filePath: string): Promise<ChatSession> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.importSession(content);
  }

  // Merge multiple sessions
  async mergeSessions(sessionIds: string[], newName?: string): Promise<ChatSession> {
    const sessions = sessionIds
      .map(id => this.sessions.get(id))
      .filter((s): s is ChatSession => s !== undefined);
    
    if (sessions.length === 0) {
      throw new Error('No valid sessions to merge');
    }

    // Collect all messages and sort by timestamp
    const allMessages = sessions
      .flatMap(s => s.messages)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const merged: ChatSession = {
      id: uuidv4(),
      name: newName || `Merged: ${sessions.map(s => s.name).join(' + ')}`,
      modelId: sessions[0].modelId,
      messages: allMessages,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { mergedFrom: sessionIds },
    };

    this.sessions.set(merged.id, merged);
    this.saveSession(merged);
    
    for (const message of merged.messages) {
      this.saveMessage(merged.id, message);
    }
    
    logger.info(this.name, `Merged ${sessions.length} sessions into: ${merged.name}`);
    return merged;
  }

  // Split a session at a specific message
  async splitSession(sessionId: string, messageId: string): Promise<[ChatSession, ChatSession]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const splitIndex = session.messages.findIndex(m => m.id === messageId);
    if (splitIndex === -1) {
      throw new Error(`Message not found: ${messageId}`);
    }

    const firstPart: ChatSession = {
      id: uuidv4(),
      name: `${session.name} (Part 1)`,
      modelId: session.modelId,
      messages: session.messages.slice(0, splitIndex),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { splitFrom: sessionId },
    };

    const secondPart: ChatSession = {
      id: uuidv4(),
      name: `${session.name} (Part 2)`,
      modelId: session.modelId,
      messages: session.messages.slice(splitIndex),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { splitFrom: sessionId },
    };

    this.sessions.set(firstPart.id, firstPart);
    this.sessions.set(secondPart.id, secondPart);
    
    this.saveSession(firstPart);
    this.saveSession(secondPart);
    
    for (const message of firstPart.messages) {
      this.saveMessage(firstPart.id, message);
    }
    for (const message of secondPart.messages) {
      this.saveMessage(secondPart.id, message);
    }
    
    logger.info(this.name, `Split session into: ${firstPart.name} and ${secondPart.name}`);
    return [firstPart, secondPart];
  }

  // Clear messages from a session
  async clearSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    session.messages = [];
    session.updatedAt = new Date();
    
    if (this.db) {
      this.db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
    }
    
    return true;
  }

  // Get session statistics
  getStats(): {
    totalSessions: number;
    totalMessages: number;
    avgMessagesPerSession: number;
    oldestSession: Date | null;
    newestSession: Date | null;
  } {
    const sessions = Array.from(this.sessions.values());
    const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
    
    return {
      totalSessions: sessions.length,
      totalMessages,
      avgMessagesPerSession: sessions.length > 0 ? totalMessages / sessions.length : 0,
      oldestSession: sessions.length > 0 
        ? new Date(Math.min(...sessions.map(s => s.createdAt.getTime())))
        : null,
      newestSession: sessions.length > 0
        ? new Date(Math.max(...sessions.map(s => s.createdAt.getTime())))
        : null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helper methods
  // ─────────────────────────────────────────────────────────────────────────────

  private sessionToMarkdown(session: ChatSession): string {
    let md = `# ${session.name}\n\n`;
    md += `*Created: ${session.createdAt.toISOString()}*\n\n`;
    md += `---\n\n`;
    
    for (const message of session.messages) {
      const roleLabel = message.role === 'user' ? '👤 User' : 
                        message.role === 'assistant' ? '🤖 Assistant' :
                        message.role === 'system' ? '⚙️ System' : '🔧 Tool';
      
      md += `### ${roleLabel}\n\n`;
      md += `${message.content}\n\n`;
      md += `---\n\n`;
    }
    
    return md;
  }

  private sessionToText(session: ChatSession): string {
    let text = `=== ${session.name} ===\n`;
    text += `Created: ${session.createdAt.toISOString()}\n\n`;
    
    for (const message of session.messages) {
      text += `[${message.role.toUpperCase()}] ${message.timestamp.toISOString()}\n`;
      text += `${message.content}\n\n`;
    }
    
    return text;
  }

  private saveSession(session: ChatSession): void {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (id, name, model_id, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      session.id,
      session.name,
      session.modelId || null,
      session.createdAt.toISOString(),
      session.updatedAt.toISOString(),
      JSON.stringify(session.metadata)
    );
  }

  private saveMessage(sessionId: string, message: ChatMessage): void {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO messages (id, session_id, role, content, timestamp, metadata, tool_calls)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      message.id,
      sessionId,
      message.role,
      message.content,
      message.timestamp.toISOString(),
      message.metadata ? JSON.stringify(message.metadata) : null,
      message.toolCalls ? JSON.stringify(message.toolCalls) : null
    );
  }

  private updateSessionTimestamp(sessionId: string): void {
    if (!this.db) return;
    
    this.db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), sessionId);
  }
}

export default ChatSessionManagerAgent;
