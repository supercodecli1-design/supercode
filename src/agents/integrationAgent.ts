// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Integration Agent
// External LLMs, APIs, databases integration
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { ExternalIntegration } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

interface LLMIntegration extends ExternalIntegration {
  type: 'llm';
  config: {
    provider: 'openai' | 'anthropic' | 'ollama' | 'lmstudio' | 'custom';
    endpoint: string;
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
}

interface APIIntegration extends ExternalIntegration {
  type: 'api';
  config: {
    baseUrl: string;
    headers?: Record<string, string>;
    auth?: {
      type: 'bearer' | 'basic' | 'apikey';
      credentials: string;
    };
  };
}

interface DatabaseIntegration extends ExternalIntegration {
  type: 'database';
  config: {
    driver: 'sqlite' | 'postgres' | 'mysql' | 'mongodb';
    connectionString: string;
  };
}

interface WebhookIntegration extends ExternalIntegration {
  type: 'webhook';
  config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    events: string[];
  };
}

type Integration = LLMIntegration | APIIntegration | DatabaseIntegration | WebhookIntegration;

export class IntegrationAgent extends BaseAgent {
  private integrations: Map<string, Integration> = new Map();
  private healthStatus: Map<string, { healthy: boolean; lastCheck: Date; error?: string }> = new Map();

  constructor() {
    super({ name: 'IntegrationAgent', priority: 5 });
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '🔌 Initializing Integration Agent');
    
    // Load default integrations
    this.loadDefaultIntegrations();
    
    // Start health check loop
    this.startHealthChecks();
    
    logger.info(this.name, `Loaded ${this.integrations.size} integrations`);
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down Integration Agent');
  }

  protected async processTask(task: unknown): Promise<unknown> {
    const { action, ...params } = task as { action: string; [key: string]: unknown };
    
    switch (action) {
      case 'list':
        return this.getIntegrations();
      case 'add':
        return this.addIntegration(params as Partial<Integration>);
      case 'remove':
        return this.removeIntegration(params.id as string);
      case 'test':
        return this.testIntegration(params.id as string);
      case 'call':
        return this.callIntegration(params.id as string, params.request as unknown);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private loadDefaultIntegrations(): void {
    // Ollama (local)
    this.addIntegration({
      id: 'ollama-local',
      name: 'Ollama (Local)',
      type: 'llm',
      config: {
        provider: 'ollama',
        endpoint: 'http://localhost:11434',
      },
      enabled: true,
    });

    // LM Studio (local)
    this.addIntegration({
      id: 'lmstudio-local',
      name: 'LM Studio (Local)',
      type: 'llm',
      config: {
        provider: 'lmstudio',
        endpoint: 'http://localhost:1234/v1',
      },
      enabled: true,
    });

    // OpenAI (requires API key)
    this.addIntegration({
      id: 'openai',
      name: 'OpenAI',
      type: 'llm',
      config: {
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-4',
      },
      enabled: false, // Disabled until API key is set
    });

    // Anthropic (requires API key)
    this.addIntegration({
      id: 'anthropic',
      name: 'Anthropic Claude',
      type: 'llm',
      config: {
        provider: 'anthropic',
        endpoint: 'https://api.anthropic.com/v1',
        model: 'claude-3-sonnet-20240229',
      },
      enabled: false,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Integration Management
  // ─────────────────────────────────────────────────────────────────────────────

  addIntegration(integration: Partial<Integration>): Integration {
    const newIntegration: Integration = {
      id: integration.id || uuidv4(),
      name: integration.name || 'New Integration',
      type: integration.type || 'api',
      config: integration.config || {},
      enabled: integration.enabled ?? true,
    } as Integration;

    this.integrations.set(newIntegration.id, newIntegration);
    logger.info(this.name, `Added integration: ${newIntegration.name}`);
    
    return newIntegration;
  }

  removeIntegration(id: string): boolean {
    const deleted = this.integrations.delete(id);
    this.healthStatus.delete(id);
    return deleted;
  }

  getIntegration(id: string): Integration | undefined {
    return this.integrations.get(id);
  }

  getIntegrations(): Integration[] {
    return Array.from(this.integrations.values());
  }

  getIntegrationsByType(type: Integration['type']): Integration[] {
    return Array.from(this.integrations.values()).filter(i => i.type === type);
  }

  enableIntegration(id: string): boolean {
    const integration = this.integrations.get(id);
    if (integration) {
      integration.enabled = true;
      return true;
    }
    return false;
  }

  disableIntegration(id: string): boolean {
    const integration = this.integrations.get(id);
    if (integration) {
      integration.enabled = false;
      return true;
    }
    return false;
  }

  updateIntegrationConfig(id: string, config: Record<string, unknown>): boolean {
    const integration = this.integrations.get(id);
    if (integration) {
      integration.config = { ...integration.config, ...config };
      return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Health Checks
  // ─────────────────────────────────────────────────────────────────────────────

  private startHealthChecks(): void {
    // Check health every 60 seconds
    setInterval(() => {
      this.checkAllHealth();
    }, 60000);

    // Initial check
    this.checkAllHealth();
  }

  private async checkAllHealth(): Promise<void> {
    for (const [id, integration] of this.integrations) {
      if (integration.enabled) {
        await this.checkHealth(id);
      }
    }
  }

  async checkHealth(id: string): Promise<boolean> {
    const integration = this.integrations.get(id);
    if (!integration) return false;

    try {
      let healthy = false;

      switch (integration.type) {
        case 'llm':
          healthy = await this.checkLLMHealth(integration as LLMIntegration);
          break;
        case 'api':
          healthy = await this.checkAPIHealth(integration as APIIntegration);
          break;
        case 'database':
          healthy = await this.checkDatabaseHealth(integration as DatabaseIntegration);
          break;
        case 'webhook':
          healthy = true; // Webhooks are outbound, assume healthy
          break;
      }

      this.healthStatus.set(id, { healthy, lastCheck: new Date() });
      return healthy;
    } catch (error) {
      this.healthStatus.set(id, {
        healthy: false,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private async checkLLMHealth(integration: LLMIntegration): Promise<boolean> {
    const { endpoint, provider } = integration.config;
    
    try {
      let url: string;
      switch (provider) {
        case 'ollama':
          url = `${endpoint}/api/tags`;
          break;
        case 'lmstudio':
        case 'openai':
          url = `${endpoint}/models`;
          break;
        default:
          url = endpoint;
      }

      const response = await fetch(url, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkAPIHealth(integration: APIIntegration): Promise<boolean> {
    try {
      const response = await fetch(integration.config.baseUrl, {
        method: 'HEAD',
        headers: integration.config.headers,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkDatabaseHealth(integration: DatabaseIntegration): Promise<boolean> {
    // For now, just return true - actual implementation would test connection
    return true;
  }

  getHealthStatus(id: string): { healthy: boolean; lastCheck: Date; error?: string } | undefined {
    return this.healthStatus.get(id);
  }

  getAllHealthStatus(): Map<string, { healthy: boolean; lastCheck: Date; error?: string }> {
    return new Map(this.healthStatus);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Integration Calls
  // ─────────────────────────────────────────────────────────────────────────────

  async testIntegration(id: string): Promise<{ success: boolean; message: string; latency?: number }> {
    const start = Date.now();
    const healthy = await this.checkHealth(id);
    const latency = Date.now() - start;

    return {
      success: healthy,
      message: healthy ? 'Integration is healthy' : 'Integration check failed',
      latency,
    };
  }

  async callIntegration(id: string, request: unknown): Promise<unknown> {
    const integration = this.integrations.get(id);
    if (!integration) {
      throw new Error(`Integration not found: ${id}`);
    }
    if (!integration.enabled) {
      throw new Error(`Integration is disabled: ${id}`);
    }

    switch (integration.type) {
      case 'llm':
        return this.callLLM(integration as LLMIntegration, request);
      case 'api':
        return this.callAPI(integration as APIIntegration, request);
      case 'webhook':
        return this.callWebhook(integration as WebhookIntegration, request);
      default:
        throw new Error(`Unsupported integration type: ${integration.type}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LLM Integration
  // ─────────────────────────────────────────────────────────────────────────────

  private async callLLM(integration: LLMIntegration, request: unknown): Promise<unknown> {
    const { endpoint, provider, apiKey, model, maxTokens, temperature } = integration.config;
    const req = request as { messages?: Array<{ role: string; content: string }>; prompt?: string };

    let url: string;
    let body: unknown;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (provider) {
      case 'ollama':
        url = `${endpoint}/api/chat`;
        body = {
          model: model || 'llama2',
          messages: req.messages || [{ role: 'user', content: req.prompt }],
          stream: false,
        };
        break;

      case 'lmstudio':
      case 'openai':
        url = `${endpoint}/chat/completions`;
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        body = {
          model: model || 'gpt-3.5-turbo',
          messages: req.messages || [{ role: 'user', content: req.prompt }],
          max_tokens: maxTokens || 1000,
          temperature: temperature || 0.7,
        };
        break;

      case 'anthropic':
        url = `${endpoint}/messages`;
        if (apiKey) {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        }
        body = {
          model: model || 'claude-3-sonnet-20240229',
          messages: req.messages || [{ role: 'user', content: req.prompt }],
          max_tokens: maxTokens || 1000,
        };
        break;

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // API Integration
  // ─────────────────────────────────────────────────────────────────────────────

  private async callAPI(integration: APIIntegration, request: unknown): Promise<unknown> {
    const { baseUrl, headers: configHeaders, auth } = integration.config;
    const req = request as { path?: string; method?: string; body?: unknown; headers?: Record<string, string> };

    const url = `${baseUrl}${req.path || ''}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...configHeaders,
      ...req.headers,
    };

    // Add authentication
    if (auth) {
      switch (auth.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${auth.credentials}`;
          break;
        case 'basic':
          headers['Authorization'] = `Basic ${Buffer.from(auth.credentials).toString('base64')}`;
          break;
        case 'apikey':
          headers['X-API-Key'] = auth.credentials;
          break;
      }
    }

    const response = await fetch(url, {
      method: req.method || 'GET',
      headers,
      body: req.body ? JSON.stringify(req.body) : undefined,
    });

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Webhook Integration
  // ─────────────────────────────────────────────────────────────────────────────

  private async callWebhook(integration: WebhookIntegration, request: unknown): Promise<unknown> {
    const { url, method, headers: configHeaders } = integration.config;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...configHeaders,
      },
      body: method !== 'GET' ? JSON.stringify(request) : undefined,
    });

    return {
      status: response.status,
      ok: response.ok,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Convenience Methods
  // ─────────────────────────────────────────────────────────────────────────────

  // Quick chat with any LLM integration
  async chat(integrationId: string, message: string): Promise<string> {
    const result = await this.callLLM(
      this.integrations.get(integrationId) as LLMIntegration,
      { messages: [{ role: 'user', content: message }] }
    ) as any;

    // Extract response based on provider format
    if (result.message?.content) return result.message.content; // Ollama
    if (result.choices?.[0]?.message?.content) return result.choices[0].message.content; // OpenAI
    if (result.content?.[0]?.text) return result.content[0].text; // Anthropic
    
    return JSON.stringify(result);
  }

  // Get available LLM integrations
  getAvailableLLMs(): LLMIntegration[] {
    return this.getIntegrationsByType('llm')
      .filter(i => i.enabled && this.healthStatus.get(i.id)?.healthy) as LLMIntegration[];
  }

  // Get first available LLM
  getDefaultLLM(): LLMIntegration | undefined {
    return this.getAvailableLLMs()[0];
  }
}

export default IntegrationAgent;
