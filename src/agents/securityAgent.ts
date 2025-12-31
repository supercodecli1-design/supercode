// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Security Agent
// Token & secret management, access control per agent/module
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { SecretEntry, Permission } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export class SecurityAgent extends BaseAgent {
  private secrets: Map<string, SecretEntry> = new Map();
  private permissions: Map<string, Permission[]> = new Map();
  private encryptionKey: Buffer;
  private secretsPath: string;
  private permissionsPath: string;

  constructor() {
    super({ name: 'SecurityAgent', priority: 10 });
    this.secretsPath = path.join(process.cwd(), '.voltagent', 'secrets.enc');
    this.permissionsPath = path.join(process.cwd(), '.voltagent', 'permissions.json');
    // Generate or load encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '🔐 Initializing Security Agent');
    
    await fs.mkdir(path.dirname(this.secretsPath), { recursive: true });
    
    await this.loadSecrets();
    await this.loadPermissions();
    
    logger.info(this.name, `Loaded ${this.secrets.size} secrets, ${this.permissions.size} permission sets`);
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down Security Agent');
    await this.saveSecrets();
    await this.savePermissions();
  }

  protected async processTask(task: unknown): Promise<unknown> {
    const { action, ...params } = task as { action: string; [key: string]: unknown };
    
    switch (action) {
      case 'getSecret':
        return this.getSecret(params.name as string);
      case 'setSecret':
        return this.setSecret(params.name as string, params.value as string, params.type as SecretEntry['type']);
      case 'deleteSecret':
        return this.deleteSecret(params.name as string);
      case 'checkPermission':
        return this.checkPermission(params.agentId as string, params.resource as string, params.action as string);
      case 'grantPermission':
        return this.grantPermission(params as unknown as Permission);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Encryption
  // ─────────────────────────────────────────────────────────────────────────────

  private getOrCreateEncryptionKey(): Buffer {
    const keyPath = path.join(process.cwd(), '.voltagent', '.key');
    try {
      // Try to read existing key synchronously during construction
      const keyData = require('fs').readFileSync(keyPath);
      return keyData;
    } catch {
      // Generate new key
      const key = crypto.randomBytes(32);
      try {
        require('fs').mkdirSync(path.dirname(keyPath), { recursive: true });
        require('fs').writeFileSync(keyPath, key, { mode: 0o600 });
      } catch {
        // If we can't write, just use the generated key in memory
      }
      return key;
    }
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Secrets Management
  // ─────────────────────────────────────────────────────────────────────────────

  async setSecret(name: string, value: string, type: SecretEntry['type'] = 'api_key'): Promise<SecretEntry> {
    const encryptedValue = this.encrypt(value);
    
    const secret: SecretEntry = {
      id: this.secrets.get(name)?.id || uuidv4(),
      name,
      type,
      encryptedValue,
      createdAt: this.secrets.get(name)?.createdAt || new Date(),
    };

    this.secrets.set(name, secret);
    await this.saveSecrets();
    
    logger.info(this.name, `Secret stored: ${name}`);
    return { ...secret, encryptedValue: '***' }; // Don't return actual encrypted value
  }

  getSecret(name: string): string | null {
    const secret = this.secrets.get(name);
    if (!secret) return null;
    
    try {
      secret.lastUsed = new Date();
      return this.decrypt(secret.encryptedValue);
    } catch (error) {
      logger.error(this.name, `Failed to decrypt secret: ${name}`);
      return null;
    }
  }

  async deleteSecret(name: string): Promise<boolean> {
    const deleted = this.secrets.delete(name);
    if (deleted) {
      await this.saveSecrets();
      logger.info(this.name, `Secret deleted: ${name}`);
    }
    return deleted;
  }

  listSecrets(): Array<Omit<SecretEntry, 'encryptedValue'>> {
    return Array.from(this.secrets.values()).map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      lastUsed: s.lastUsed,
    }));
  }

  hasSecret(name: string): boolean {
    return this.secrets.has(name);
  }

  // Check if a secret is expired
  isSecretExpired(name: string): boolean {
    const secret = this.secrets.get(name);
    if (!secret?.expiresAt) return false;
    return secret.expiresAt < new Date();
  }

  // Set secret expiration
  async setSecretExpiration(name: string, expiresAt: Date): Promise<boolean> {
    const secret = this.secrets.get(name);
    if (!secret) return false;
    
    secret.expiresAt = expiresAt;
    await this.saveSecrets();
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Permissions Management
  // ─────────────────────────────────────────────────────────────────────────────

  grantPermission(permission: Permission): void {
    const existing = this.permissions.get(permission.agentId) || [];
    
    // Check if permission already exists
    const existingPerm = existing.find(p => p.resource === permission.resource);
    if (existingPerm) {
      // Merge actions
      existingPerm.actions = [...new Set([...existingPerm.actions, ...permission.actions])];
    } else {
      existing.push(permission);
    }
    
    this.permissions.set(permission.agentId, existing);
    this.savePermissions();
    
    logger.info(this.name, `Granted permission to ${permission.agentId} for ${permission.resource}`);
  }

  revokePermission(agentId: string, resource: string, actions?: Permission['actions']): boolean {
    const existing = this.permissions.get(agentId);
    if (!existing) return false;
    
    const permIndex = existing.findIndex(p => p.resource === resource);
    if (permIndex === -1) return false;
    
    if (actions) {
      // Remove specific actions
      existing[permIndex].actions = existing[permIndex].actions.filter(a => !actions.includes(a));
      if (existing[permIndex].actions.length === 0) {
        existing.splice(permIndex, 1);
      }
    } else {
      // Remove entire permission
      existing.splice(permIndex, 1);
    }
    
    this.permissions.set(agentId, existing);
    this.savePermissions();
    
    logger.info(this.name, `Revoked permission from ${agentId} for ${resource}`);
    return true;
  }

  checkPermission(agentId: string, resource: string, action: string): boolean {
    const permissions = this.permissions.get(agentId);
    if (!permissions) return false;
    
    // Check for wildcard permission
    const wildcardPerm = permissions.find(p => p.resource === '*');
    if (wildcardPerm?.actions.includes(action as any) || wildcardPerm?.actions.includes('execute' as any)) {
      return true;
    }
    
    // Check specific resource permission
    const resourcePerm = permissions.find(p => p.resource === resource);
    return resourcePerm?.actions.includes(action as any) || false;
  }

  getPermissions(agentId: string): Permission[] {
    return this.permissions.get(agentId) || [];
  }

  getAllPermissions(): Map<string, Permission[]> {
    return new Map(this.permissions);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Token Generation
  // ─────────────────────────────────────────────────────────────────────────────

  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateApiKey(prefix: string = 'sk'): string {
    const token = crypto.randomBytes(24).toString('base64url');
    return `${prefix}_${token}`;
  }

  // Hash a value (for comparison without storing plaintext)
  hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  // Verify a value against a hash
  verifyHash(value: string, hash: string): boolean {
    return this.hashValue(value) === hash;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Audit Log
  // ─────────────────────────────────────────────────────────────────────────────

  private auditLog: Array<{
    timestamp: Date;
    action: string;
    agentId?: string;
    resource?: string;
    success: boolean;
    details?: string;
  }> = [];

  logAudit(action: string, agentId?: string, resource?: string, success: boolean = true, details?: string): void {
    this.auditLog.push({
      timestamp: new Date(),
      action,
      agentId,
      resource,
      success,
      details,
    });

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }
  }

  getAuditLog(limit?: number): typeof this.auditLog {
    return limit ? this.auditLog.slice(-limit) : [...this.auditLog];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Environment Variables
  // ─────────────────────────────────────────────────────────────────────────────

  getEnvSecret(name: string): string | undefined {
    return process.env[name];
  }

  setEnvSecret(name: string, value: string): void {
    process.env[name] = value;
  }

  // Load secrets from .env file
  async loadEnvFile(filePath: string): Promise<number> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      let count = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
          count++;
        }
      }

      logger.info(this.name, `Loaded ${count} environment variables from ${filePath}`);
      return count;
    } catch (error) {
      logger.warn(this.name, `Could not load env file: ${filePath}`);
      return 0;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────────────────

  private async loadSecrets(): Promise<void> {
    try {
      const content = await fs.readFile(this.secretsPath, 'utf-8');
      const data = JSON.parse(this.decrypt(content));
      
      for (const secret of data) {
        this.secrets.set(secret.name, {
          ...secret,
          createdAt: new Date(secret.createdAt),
          expiresAt: secret.expiresAt ? new Date(secret.expiresAt) : undefined,
          lastUsed: secret.lastUsed ? new Date(secret.lastUsed) : undefined,
        });
      }
    } catch (error) {
      // No secrets file or decryption failed
    }
  }

  private async saveSecrets(): Promise<void> {
    try {
      const data = Array.from(this.secrets.values());
      const encrypted = this.encrypt(JSON.stringify(data));
      await fs.writeFile(this.secretsPath, encrypted, { mode: 0o600 });
    } catch (error) {
      logger.error(this.name, 'Failed to save secrets', error);
    }
  }

  private async loadPermissions(): Promise<void> {
    try {
      const content = await fs.readFile(this.permissionsPath, 'utf-8');
      const data = JSON.parse(content) as Record<string, Permission[]>;
      
      for (const [agentId, perms] of Object.entries(data)) {
        this.permissions.set(agentId, perms);
      }
    } catch (error) {
      // No permissions file
    }
  }

  private async savePermissions(): Promise<void> {
    try {
      const data = Object.fromEntries(this.permissions);
      await fs.writeFile(this.permissionsPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(this.name, 'Failed to save permissions', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Security Checks
  // ─────────────────────────────────────────────────────────────────────────────

  // Validate API key format
  isValidApiKeyFormat(key: string): boolean {
    // Common API key patterns
    const patterns = [
      /^sk_[a-zA-Z0-9_-]{20,}$/, // OpenAI-style
      /^[a-zA-Z0-9]{32,}$/, // Generic hex/alphanumeric
      /^[a-zA-Z0-9_-]{20,}$/, // Generic with dashes
    ];
    return patterns.some(p => p.test(key));
  }

  // Sanitize input to prevent injection
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .trim();
  }

  // Check for sensitive data in string
  containsSensitiveData(text: string): boolean {
    const patterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card
      /\bsk_[a-zA-Z0-9_-]{20,}\b/, // API key
      /\b[A-Za-z0-9+/]{40,}={0,2}\b/, // Base64 encoded secrets
    ];
    return patterns.some(p => p.test(text));
  }
}

export default SecurityAgent;
