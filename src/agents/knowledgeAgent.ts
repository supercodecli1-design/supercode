// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Knowledge Agent
// RAG + KB integration, document versioning, search & retrieval
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { KnowledgeDocument, KnowledgeQuery } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export class KnowledgeAgent extends BaseAgent {
  private db: any;
  private dbPath: string;
  private documents: Map<string, KnowledgeDocument> = new Map();
  private embeddingEndpoint: string = 'http://localhost:11434/api/embeddings';
  private embeddingModel: string = 'all-minilm';

  constructor() {
    super({ name: 'KnowledgeAgent', priority: 7 });
    this.dbPath = path.join(process.cwd(), '.voltagent', 'knowledge.db');
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '📚 Initializing Knowledge Agent');
    
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    
    try {
      const Database = (await import('better-sqlite3')).default;
      this.db = new Database(this.dbPath);
      this.createTables();
      await this.loadDocuments();
      logger.info(this.name, `Knowledge base initialized with ${this.documents.size} documents`);
    } catch (error) {
      logger.warn(this.name, 'SQLite not available, using in-memory storage');
      this.db = null;
    }
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down Knowledge Agent');
    if (this.db) {
      this.db.close();
    }
    this.documents.clear();
  }

  protected async processTask(task: unknown): Promise<unknown> {
    const { action, ...params } = task as { action: string; [key: string]: unknown };
    
    switch (action) {
      case 'add':
        return this.addDocument(params as Partial<KnowledgeDocument>);
      case 'search':
        return this.search(params as unknown as KnowledgeQuery);
      case 'get':
        return this.getDocument(params.id as string);
      case 'delete':
        return this.deleteDocument(params.id as string);
      case 'update':
        return this.updateDocument(params.id as string, params as Partial<KnowledgeDocument>);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private createTables(): void {
    if (!this.db) return;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        source TEXT,
        version INTEGER DEFAULT 1,
        tags TEXT,
        embedding TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_docs_type ON documents(type);
      CREATE INDEX IF NOT EXISTS idx_docs_title ON documents(title);
      
      CREATE TABLE IF NOT EXISTS document_versions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id)
      );
    `);
  }

  private async loadDocuments(): Promise<void> {
    if (!this.db) return;
    
    const rows = this.db.prepare('SELECT * FROM documents').all();
    for (const row of rows) {
      this.documents.set(row.id, this.rowToDocument(row));
    }
  }

  // Add a new document
  async addDocument(doc: Partial<KnowledgeDocument>): Promise<KnowledgeDocument> {
    const document: KnowledgeDocument = {
      id: doc.id || uuidv4(),
      title: doc.title || 'Untitled',
      content: doc.content || '',
      type: doc.type || 'text',
      source: doc.source || 'manual',
      version: 1,
      tags: doc.tags || [],
      metadata: doc.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Generate embedding if possible
    document.embedding = await this.generateEmbedding(document.content);

    this.documents.set(document.id, document);

    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT INTO documents 
        (id, title, content, type, source, version, tags, embedding, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        document.id,
        document.title,
        document.content,
        document.type,
        document.source,
        document.version,
        JSON.stringify(document.tags),
        document.embedding ? JSON.stringify(document.embedding) : null,
        JSON.stringify(document.metadata),
        document.createdAt.toISOString(),
        document.updatedAt.toISOString()
      );
    }

    logger.info(this.name, `Added document: ${document.title}`);
    return document;
  }

  // Update a document (creates new version)
  async updateDocument(id: string, updates: Partial<KnowledgeDocument>): Promise<KnowledgeDocument | null> {
    const existing = this.documents.get(id);
    if (!existing) return null;

    // Save current version
    if (this.db) {
      const versionStmt = this.db.prepare(`
        INSERT INTO document_versions (id, document_id, version, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      versionStmt.run(uuidv4(), id, existing.version, existing.content, new Date().toISOString());
    }

    // Update document
    const updated: KnowledgeDocument = {
      ...existing,
      ...updates,
      id,
      version: existing.version + 1,
      updatedAt: new Date(),
    };

    // Regenerate embedding if content changed
    if (updates.content && updates.content !== existing.content) {
      updated.embedding = await this.generateEmbedding(updated.content);
    }

    this.documents.set(id, updated);

    if (this.db) {
      const stmt = this.db.prepare(`
        UPDATE documents SET
          title = ?, content = ?, type = ?, source = ?, version = ?,
          tags = ?, embedding = ?, metadata = ?, updated_at = ?
        WHERE id = ?
      `);
      
      stmt.run(
        updated.title,
        updated.content,
        updated.type,
        updated.source,
        updated.version,
        JSON.stringify(updated.tags),
        updated.embedding ? JSON.stringify(updated.embedding) : null,
        JSON.stringify(updated.metadata),
        updated.updatedAt.toISOString(),
        id
      );
    }

    logger.info(this.name, `Updated document: ${updated.title} (v${updated.version})`);
    return updated;
  }

  // Delete a document
  async deleteDocument(id: string): Promise<boolean> {
    const deleted = this.documents.delete(id);
    
    if (this.db && deleted) {
      this.db.prepare('DELETE FROM document_versions WHERE document_id = ?').run(id);
      this.db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    }

    return deleted;
  }

  // Get a document by ID
  async getDocument(id: string): Promise<KnowledgeDocument | null> {
    return this.documents.get(id) || null;
  }

  // Get document versions
  async getVersions(documentId: string): Promise<Array<{ version: number; content: string; createdAt: Date }>> {
    if (!this.db) return [];
    
    const rows = this.db.prepare(
      'SELECT version, content, created_at FROM document_versions WHERE document_id = ? ORDER BY version DESC'
    ).all(documentId);
    
    return rows.map((row: any) => ({
      version: row.version,
      content: row.content,
      createdAt: new Date(row.created_at),
    }));
  }

  // Search documents
  async search(query: KnowledgeQuery): Promise<KnowledgeDocument[]> {
    let results: KnowledgeDocument[] = [];

    // If we have embeddings, use semantic search
    if (query.query) {
      const queryEmbedding = await this.generateEmbedding(query.query);
      
      if (queryEmbedding) {
        results = this.semanticSearch(queryEmbedding, query);
      } else {
        // Fallback to text search
        results = this.textSearch(query);
      }
    } else {
      results = Array.from(this.documents.values());
    }

    // Apply filters
    if (query.type) {
      results = results.filter(d => d.type === query.type);
    }
    if (query.tags && query.tags.length > 0) {
      results = results.filter(d => 
        query.tags!.some(tag => d.tags.includes(tag))
      );
    }

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  // Semantic search using embeddings
  private semanticSearch(queryEmbedding: number[], query: KnowledgeQuery): KnowledgeDocument[] {
    const threshold = query.threshold || 0.5;
    const scored: Array<{ doc: KnowledgeDocument; score: number }> = [];

    for (const doc of this.documents.values()) {
      if (doc.embedding) {
        const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
        if (score >= threshold) {
          scored.push({ doc, score });
        }
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.doc);
  }

  // Text-based search
  private textSearch(query: KnowledgeQuery): KnowledgeDocument[] {
    const searchTerm = query.query?.toLowerCase() || '';
    
    return Array.from(this.documents.values()).filter(doc =>
      doc.title.toLowerCase().includes(searchTerm) ||
      doc.content.toLowerCase().includes(searchTerm) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Generate embedding for text
  private async generateEmbedding(text: string): Promise<number[] | undefined> {
    try {
      const response = await fetch(this.embeddingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          prompt: text.slice(0, 8000), // Limit text length
        }),
      });

      if (!response.ok) {
        return undefined;
      }

      const data = await response.json() as { embedding: number[] };
      return data.embedding;
    } catch (error) {
      logger.debug(this.name, 'Could not generate embedding');
      return undefined;
    }
  }

  // Calculate cosine similarity between two vectors
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // RAG: Retrieve and augment context
  async retrieveContext(query: string, maxDocs: number = 5): Promise<string> {
    const docs = await this.search({ query, limit: maxDocs });
    
    if (docs.length === 0) {
      return '';
    }

    const context = docs.map(doc => 
      `### ${doc.title}\n${doc.content}`
    ).join('\n\n---\n\n');

    return `## Relevant Knowledge\n\n${context}`;
  }

  // Import documents from directory
  async importFromDirectory(dirPath: string): Promise<number> {
    let count = 0;
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
          const content = await fs.readFile(filePath, 'utf-8');
          const ext = path.extname(file).toLowerCase();
          
          let type: KnowledgeDocument['type'] = 'text';
          if (['.md', '.markdown'].includes(ext)) type = 'markdown';
          else if (['.json'].includes(ext)) type = 'json';
          else if (['.yaml', '.yml'].includes(ext)) type = 'yaml';
          else if (['.ts', '.js', '.py', '.go', '.rs'].includes(ext)) type = 'code';
          
          await this.addDocument({
            title: file,
            content,
            type,
            source: filePath,
            tags: [ext.slice(1)],
          });
          count++;
        }
      }
    } catch (error) {
      logger.error(this.name, `Error importing from ${dirPath}`, error);
    }

    logger.info(this.name, `Imported ${count} documents from ${dirPath}`);
    return count;
  }

  // Export documents to directory
  async exportToDirectory(dirPath: string): Promise<number> {
    await fs.mkdir(dirPath, { recursive: true });
    let count = 0;

    for (const doc of this.documents.values()) {
      const ext = doc.type === 'markdown' ? '.md' : 
                  doc.type === 'json' ? '.json' :
                  doc.type === 'yaml' ? '.yaml' :
                  doc.type === 'code' ? '.txt' : '.txt';
      
      const fileName = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`;
      await fs.writeFile(path.join(dirPath, fileName), doc.content);
      count++;
    }

    logger.info(this.name, `Exported ${count} documents to ${dirPath}`);
    return count;
  }

  // Get all documents
  getAllDocuments(): KnowledgeDocument[] {
    return Array.from(this.documents.values());
  }

  // Get documents by type
  getDocumentsByType(type: KnowledgeDocument['type']): KnowledgeDocument[] {
    return Array.from(this.documents.values()).filter(d => d.type === type);
  }

  // Get documents by tag
  getDocumentsByTag(tag: string): KnowledgeDocument[] {
    return Array.from(this.documents.values()).filter(d => d.tags.includes(tag));
  }

  // Get all tags
  getAllTags(): string[] {
    const tags = new Set<string>();
    for (const doc of this.documents.values()) {
      doc.tags.forEach(tag => tags.add(tag));
    }
    return Array.from(tags);
  }

  // Get statistics
  getStats(): {
    totalDocuments: number;
    byType: Record<string, number>;
    totalTags: number;
    withEmbeddings: number;
  } {
    const byType: Record<string, number> = {};
    let withEmbeddings = 0;

    for (const doc of this.documents.values()) {
      byType[doc.type] = (byType[doc.type] || 0) + 1;
      if (doc.embedding) withEmbeddings++;
    }

    return {
      totalDocuments: this.documents.size,
      byType,
      totalTags: this.getAllTags().length,
      withEmbeddings,
    };
  }

  private rowToDocument(row: any): KnowledgeDocument {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      source: row.source,
      version: row.version,
      tags: row.tags ? JSON.parse(row.tags) : [],
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default KnowledgeAgent;
