// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Model Router Agent
// Smart LLM selection by task, VRAM, latency
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { ModelConfig, ModelRouteRequest, ModelSize, ModelCapability, ModelProvider } from '../types/index.js';
import { eventBus } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export class ModelRouterAgent extends BaseAgent {
  private models: Map<string, ModelConfig> = new Map();
  private attachedModels: Set<string> = new Set();
  private maxVram: number = 6144; // Default 6GB for RTX3050
  private ollamaEndpoint: string = 'http://localhost:11434';
  private lmstudioEndpoint: string = 'http://localhost:1234';

  constructor() {
    super({ name: 'ModelRouterAgent', priority: 9 });
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '🤖 Initializing Model Router Agent');
    
    // Detect local models
    await this.detectOllamaModels();
    await this.detectLMStudioModels();
    
    // Load default model configurations
    this.loadDefaultConfigs();
    
    logger.info(this.name, `Detected ${this.models.size} models`);
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down Model Router Agent');
    this.attachedModels.clear();
  }

  protected async processTask(task: unknown): Promise<unknown> {
    const request = task as ModelRouteRequest;
    return this.routeToModel(request);
  }

  // Detect Ollama models
  private async detectOllamaModels(): Promise<void> {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
      if (!response.ok) {
        logger.warn(this.name, 'Ollama not available');
        return;
      }
      
      const data = await response.json() as { models: OllamaModel[] };
      
      for (const model of data.models || []) {
        const config = this.createModelConfig(model.name, 'ollama', model.size);
        this.models.set(config.id, config);
        logger.debug(this.name, `Detected Ollama model: ${model.name}`);
      }
    } catch (error) {
      logger.debug(this.name, 'Could not connect to Ollama');
    }
  }

  // Detect LM Studio models
  private async detectLMStudioModels(): Promise<void> {
    try {
      const response = await fetch(`${this.lmstudioEndpoint}/v1/models`);
      if (!response.ok) {
        logger.warn(this.name, 'LM Studio not available');
        return;
      }
      
      const data = await response.json() as { data: Array<{ id: string }> };
      
      for (const model of data.data || []) {
        const config = this.createModelConfig(model.id, 'lmstudio', 0);
        this.models.set(config.id, config);
        logger.debug(this.name, `Detected LM Studio model: ${model.id}`);
      }
    } catch (error) {
      logger.debug(this.name, 'Could not connect to LM Studio');
    }
  }

  // Create model configuration
  private createModelConfig(name: string, provider: ModelProvider, sizeBytes: number): ModelConfig {
    const sizeMB = Math.round(sizeBytes / (1024 * 1024));
    const size = this.categorizeSize(sizeMB);
    const capabilities = this.inferCapabilities(name);
    
    return {
      id: `${provider}:${name}`,
      name,
      provider,
      size,
      vramRequired: this.estimateVram(sizeMB),
      capabilities,
      endpoint: provider === 'ollama' ? this.ollamaEndpoint : this.lmstudioEndpoint,
      contextLength: this.inferContextLength(name),
      temperature: 0.7,
      attached: false,
    };
  }

  // Categorize model size
  private categorizeSize(sizeMB: number): ModelSize {
    if (sizeMB < 500) return 'small';
    if (sizeMB < 4000) return 'medium';
    return 'large';
  }

  // Estimate VRAM requirement
  private estimateVram(sizeMB: number): number {
    // Rough estimate: model size + 20% overhead
    return Math.round(sizeMB * 1.2);
  }

  // Infer capabilities from model name
  private inferCapabilities(name: string): ModelCapability[] {
    const capabilities: ModelCapability[] = ['chat'];
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('code') || nameLower.includes('coder') || nameLower.includes('deepseek')) {
      capabilities.push('code');
    }
    if (nameLower.includes('embed') || nameLower.includes('minilm')) {
      capabilities.push('embedding');
    }
    if (nameLower.includes('vision') || nameLower.includes('vl') || nameLower.includes('llava')) {
      capabilities.push('vision');
    }
    if (nameLower.includes('reason') || nameLower.includes('qwen3')) {
      capabilities.push('reasoning');
    }
    
    return capabilities;
  }

  // Infer context length
  private inferContextLength(name: string): number {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('128k')) return 128000;
    if (nameLower.includes('32k')) return 32000;
    if (nameLower.includes('16k')) return 16000;
    if (nameLower.includes('8k')) return 8000;
    return 4096; // Default
  }

  // Load default model configurations
  private loadDefaultConfigs(): void {
    const defaultModels: Partial<ModelConfig>[] = [
      {
        id: 'ollama:all-minilm',
        name: 'all-minilm',
        provider: 'ollama',
        size: 'small',
        vramRequired: 100,
        capabilities: ['embedding'],
        contextLength: 512,
      },
      {
        id: 'ollama:deepseek-coder',
        name: 'deepseek-coder',
        provider: 'ollama',
        size: 'medium',
        vramRequired: 4000,
        capabilities: ['chat', 'code'],
        contextLength: 16000,
      },
      {
        id: 'ollama:qwen2.5-coder',
        name: 'qwen2.5-coder',
        provider: 'ollama',
        size: 'medium',
        vramRequired: 4500,
        capabilities: ['chat', 'code', 'reasoning'],
        contextLength: 32000,
      },
    ];

    for (const config of defaultModels) {
      if (!this.models.has(config.id!)) {
        this.models.set(config.id!, {
          ...config,
          endpoint: this.ollamaEndpoint,
          temperature: 0.7,
          attached: false,
        } as ModelConfig);
      }
    }
  }

  // Route request to optimal model
  async routeToModel(request: ModelRouteRequest): Promise<ModelConfig | null> {
    const candidates = this.findCandidates(request);
    
    if (candidates.length === 0) {
      logger.warn(this.name, 'No suitable model found for request', request);
      return null;
    }

    // Sort by priority: capability match > size preference > VRAM efficiency
    candidates.sort((a, b) => {
      const aScore = this.scoreModel(a, request);
      const bScore = this.scoreModel(b, request);
      return bScore - aScore;
    });

    const selected = candidates[0];
    logger.info(this.name, `Selected model: ${selected.name} for task: ${request.task}`);
    
    return selected;
  }

  // Find candidate models
  private findCandidates(request: ModelRouteRequest): ModelConfig[] {
    const maxVram = request.maxVram || this.maxVram;
    
    return Array.from(this.models.values()).filter(model => {
      // Check VRAM constraint
      if (model.vramRequired > maxVram) return false;
      
      // Check required capabilities
      if (request.requiredCapabilities.length > 0) {
        const hasAllCapabilities = request.requiredCapabilities.every(
          cap => model.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) return false;
      }
      
      // Check size preference
      if (request.preferredSize && model.size !== request.preferredSize) {
        return false;
      }
      
      return true;
    });
  }

  // Score model for selection
  private scoreModel(model: ModelConfig, request: ModelRouteRequest): number {
    let score = 0;
    
    // Capability match bonus
    for (const cap of request.requiredCapabilities) {
      if (model.capabilities.includes(cap)) {
        score += 10;
      }
    }
    
    // Size preference bonus
    if (request.preferredSize === model.size) {
      score += 5;
    }
    
    // VRAM efficiency (prefer smaller models when possible)
    score += (this.maxVram - model.vramRequired) / 1000;
    
    // Attached model bonus
    if (this.attachedModels.has(model.id)) {
      score += 3;
    }
    
    return score;
  }

  // Attach a model
  attachModel(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model) {
      logger.warn(this.name, `Model not found: ${modelId}`);
      return false;
    }
    
    model.attached = true;
    this.attachedModels.add(modelId);
    eventBus.emitEvent({ type: 'model:attached', modelId });
    logger.info(this.name, `Attached model: ${model.name}`);
    return true;
  }

  // Detach a model
  detachModel(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model) return false;
    
    model.attached = false;
    this.attachedModels.delete(modelId);
    eventBus.emitEvent({ type: 'model:detached', modelId });
    logger.info(this.name, `Detached model: ${model.name}`);
    return true;
  }

  // Get all models
  getModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  // Get attached models
  getAttachedModels(): ModelConfig[] {
    return Array.from(this.models.values()).filter(m => m.attached);
  }

  // Get model by ID
  getModel(modelId: string): ModelConfig | undefined {
    return this.models.get(modelId);
  }

  // Set max VRAM
  setMaxVram(vram: number): void {
    this.maxVram = vram;
    logger.info(this.name, `Max VRAM set to ${vram}MB`);
  }

  // Update model personalization
  updatePersonalization(modelId: string, personalization: ModelConfig['personalization']): boolean {
    const model = this.models.get(modelId);
    if (!model) return false;
    
    model.personalization = { ...model.personalization, ...personalization };
    logger.info(this.name, `Updated personalization for ${model.name}`);
    return true;
  }

  // Refresh model list
  async refresh(): Promise<void> {
    logger.info(this.name, 'Refreshing model list...');
    await this.detectOllamaModels();
    await this.detectLMStudioModels();
    logger.info(this.name, `Found ${this.models.size} models`);
  }

  // Get models by capability
  getModelsByCapability(capability: ModelCapability): ModelConfig[] {
    return Array.from(this.models.values()).filter(m => 
      m.capabilities.includes(capability)
    );
  }

  // Get models by size
  getModelsBySize(size: ModelSize): ModelConfig[] {
    return Array.from(this.models.values()).filter(m => m.size === size);
  }
}

export default ModelRouterAgent;
