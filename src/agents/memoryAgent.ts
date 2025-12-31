// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Memory Agent
// Persistent multi-agent memory with SQLite/LibSQL
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { MemoryEntry, MemoryQuery } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { eventBus } from '../utils/eventBus.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export class MemoryAgent extends BaseAgent {
  private db: any; // better-sqlite3 Database
  private dbPath: string;
  private memoryCache: Map<string, MemoryEntry> = new Map();
  private maxCacheSize = 1000;

  constructor() {
    super({ name: 'MemoryAgent', priority: 7 });
    this.dbPath = path.join(process.cwd(), '.voltagent', 'memory.db');
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '🧠 Initializing Memory Agent');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    
    // Initialize SQLite database
    try {
      const Database = (await import('better-sqlite3')).default;
      this.db = new Database(this.dbPath);
      this.createTables();
      logger.info(this.name, `Memory database initialized at ${this.dbPath}`);
    } catch (error) {
      logger.warn(this.name, 'SQLite not available, using in-memory storage');
      this.db = null;
    }
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down Memory Agent');
    if (this.db) {
      this.db.close();
    }
    this.memoryCache.clear();
  }

  protected async processTask(task: unknown): Promise<unknown> {
    const { action, ...params } = task as { action: string; [key: string]: unknown };
    
    switch (action) {
      case 'store':
        return this.store(params as Partial<MemoryEntry>);
      case 'retrieve':
        return this.retrieve(params.id as string);
      case 'search':
        return this.search(params as MemoryQuery);
      case 'delete':
        return this.delete(params.id as string);
      case 'clear':
        return this.clear(params.agentId as string);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private createTables(): void {
    if (!this.db) return;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        embedding TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        expires_at TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id);
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
    `);
  }

  // Store a memory entry
  async store(entry: Partial<MemoryEntry>): Promise<MemoryEntry> {
    const memory: MemoryEntry = {
      id: entry.id || uuidv4(),
      agentId: entry.agentId || 'global',
      type: entry.type || 'short_term',
      content: entry.content || '',
      metadata: entry.metadata || {},
      embedding: entry.embedding,
      createdAt: entry.createdAt || new Date(),
      updatedAt: new Date(),
      expiresAt: entry.expiresAt,
    };

    // Store in cache
    this.memoryCache.set(memory.id, memory);
    if (this.memoryCache.size > this.maxCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) this.memoryCache.delete(firstKey);
    }

    // Store in database
    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO memories 
        (id, agent_id, type, content, metadata, embedding, created_at, updated_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        memory.id,
        memory.agentId,
        memory.type,
        memory.content,
        JSON.stringify(memory.metadata),
        memory.embedding ? JSON.stringify(memory.embedding) : null,
        memory.createdAt.toISOString(),
        memory.updatedAt.toISOString(),
        memory.expiresAt?.toISOString() || null
      );
    }

    eventBus.emitEvent({ type: 'memory:updated', entryId: memory.id });
    logger.debug(this.name, `Stored memory: ${memory.id}`);
    
    return memory;
  }

  // Retrieve a memory entry by ID
  async retrieve(id: string): Promise<MemoryEntry | null> {
    // Check cache first
    if (this.memoryCache.has(id)) {
      return this.memoryCache.get(id)!;
    }

    // Query database
    if (this.db) {
      const row = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
      if (row) {
        return this.rowToMemory(row);
      }
    }

    return null;
  }

  // Search memories
  async search(query: MemoryQuery): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    
    if (this.db) {
      let sql = 'SELECT * FROM memories WHERE 1=1';
      const params: unknown[] = [];

      if (query.agentId) {
        sql += ' AND agent_id = ?';
        params.push(query.agentId);
      }
      if (query.type) {
        sql += ' AND type = ?';
        params.push(query.type);
      }
      if (query.query) {
        sql += ' AND content LIKE ?';
        params.push(`%${query.query}%`);
      }
      if (query.startDate) {
        sql += ' AND created_at >= ?';
        params.push(query.startDate.toISOString());
      }
      if (query.endDate) {
        sql += ' AND created_at <= ?';
        params.push(query.endDate.toISOString());
      }

      sql += ' ORDER BY created_at DESC';
      
      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }
      if (query.offset) {
        sql += ' OFFSET ?';
        params.push(query.offset);
      }

      const rows = this.db.prepare(sql).all(...params);
      for (const row of rows) {
        results.push(this.rowToMemory(row));
      }
    } else {
      // Search in cache
      for (const memory of this.memoryCache.values()) {
        if (query.agentId && memory.agentId !== query.agentId) continue;
        if (query.type && memory.type !== query.type) continue;
        if (query.query && !memory.content.includes(query.query)) continue;
        results.push(memory);
      }
    }

    return results;
  }

  // Delete a memory entry
  async delete(id: string): Promise<boolean> {
    this.memoryCache.delete(id);
    
    if (this.db) {
      const result = this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
      return result.changes > 0;
    }
    
    return true;
  }

  // Clear memories for an agent
  async clear(agentId?: string): Promise<number> {
    let count = 0;

    if (agentId) {
      // Clear specific agent's memories
      for (const [id, memory] of this.memoryCache) {
        if (memory.agentId === agentId) {
          this.memoryCache.delete(id);
          count++;
        }
      }
      
      if (this.db) {
        const result = this.db.prepare('DELETE FROM memories WHERE agent_id = ?').run(agentId);
        count = result.changes;
      }
    } else {
      // Clear all memories
      count = this.memoryCache.size;
      this.memoryCache.clear();
      
      if (this.db) {
        const result = this.db.prepare('DELETE FROM memories').run();
        count = result.changes;
      }
    }

    logger.info(this.name, `Cleared ${count} memories`);
    return count;
  }

  // Get memory statistics
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byAgent: Record<string, number>;
    cacheSize: number;
  }> {
    const stats = {
      total: 0,
      byType: {} as Record<string, number>,
      byAgent: {} as Record<string, number>,
      cacheSize: this.memoryCache.size,
    };

    if (this.db) {
      const totalRow = this.db.prepare('SELECT COUNT(*) as count FROM memories').get();
      stats.total = totalRow.count;

      const typeRows = this.db.prepare('SELECT type, COUNT(*) as count FROM memories GROUP BY type').all();
      for (const row of typeRows) {
        stats.byType[row.type] = row.count;
      }

      const agentRows = this.db.prepare('SELECT agent_id, COUNT(*) as count FROM memories GROUP BY agent_id').all();
      for (const row of agentRows) {
        stats.byAgent[row.agent_id] = row.count;
      }
    } else {
      stats.total = this.memoryCache.size;
      for (const memory of this.memoryCache.values()) {
        stats.byType[memory.type] = (stats.byType[memory.type] || 0) + 1;
        stats.byAgent[memory.agentId] = (stats.byAgent[memory.agentId] || 0) + 1;
      }
    }

    return stats;
  }

  // Backup memories to file
  async backup(filePath: string): Promise<void> {
    const memories = await this.search({ limit: 100000 });
    await fs.writeFile(filePath, JSON.stringify(memories, null, 2));
    logger.info(this.name, `Backed up ${memories.length} memories to ${filePath}`);
  }

  // Restore memories from file
  async restore(filePath: string): Promise<number> {
    const content = await fs.readFile(filePath, 'utf-8');
    const memories = JSON.parse(content) as MemoryEntry[];
    
    for (const memory of memories) {
      await this.store({
        ...memory,
        createdAt: new Date(memory.createdAt),
        updatedAt: new Date(memory.updatedAt),
        expiresAt: memory.expiresAt ? new Date(memory.expiresAt) : undefined,
      });
    }

    logger.info(this.name, `Restored ${memories.length} memories from ${filePath}`);
    return memories.length;
  }

  // Clean expired memories
  async cleanExpired(): Promise<number> {
    const now = new Date().toISOString();
    let count = 0;

    if (this.db) {
      const result = this.db.prepare('DELETE FROM memories WHERE expires_at IS NOT NULL AND expires_at < ?').run(now);
      count = result.changes;
    }

    // Clean cache
    for (const [id, memory] of this.memoryCache) {
      if (memory.expiresAt && memory.expiresAt < new Date()) {
        this.memoryCache.delete(id);
        count++;
      }
    }

    if (count > 0) {
      logger.info(this.name, `Cleaned ${count} expired memories`);
    }
    return count;
  }

  // Get recent memories
  async getRecent(limit: number = 10, agentId?: string): Promise<MemoryEntry[]> {
    return this.search({ agentId, limit });
  }

  // Store conversation context
  async storeContext(agentId: string, context: string, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
    return this.store({
      agentId,
      type: 'short_term',
      content: context,
      metadata: { ...metadata, contextType: 'conversation' },
    });
  }

  // Store long-term knowledge
  async storeKnowledge(agentId: string, knowledge: string, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
    return this.store({
      agentId,
      type: 'long_term',
      content: knowledge,
      metadata: { ...metadata, contextType: 'knowledge' },
    });
  }

  private rowToMemory(row: any): MemoryEntry {
    return {
      id: row.id,
      agentId: row.agent_id,
      type: row.type,
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    };
  }
}

export default MemoryAgent;
