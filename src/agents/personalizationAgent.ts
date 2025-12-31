// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Personalization Agent
// Agent-level tuning, instruction injection, behavior & style configuration
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseAgent } from './baseAgent.js';
import type { ModelPersonalization, AgentSettings, GlobalSettings, Theme } from '../types/index.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs/promises';

interface PersonalizationProfile {
  id: string;
  name: string;
  description?: string;
  modelSettings: ModelPersonalization;
  agentSettings: Record<string, Partial<AgentSettings>>;
  globalSettings: Partial<GlobalSettings>;
  customInstructions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class PersonalizationAgent extends BaseAgent {
  private profiles: Map<string, PersonalizationProfile> = new Map();
  private activeProfileId: string | null = null;
  private globalSettings: GlobalSettings;
  private agentSettings: Map<string, AgentSettings> = new Map();
  private themes: Map<string, Theme> = new Map();
  private configPath: string;

  constructor() {
    super({ name: 'PersonalizationAgent', priority: 5 });
    this.configPath = path.join(process.cwd(), '.voltagent', 'config');
    this.globalSettings = this.getDefaultGlobalSettings();
  }

  async initialize(): Promise<void> {
    logger.info(this.name, '🎨 Initializing Personalization Agent');
    
    await fs.mkdir(this.configPath, { recursive: true });
    
    // Load themes
    this.loadBuiltInThemes();
    
    // Load saved settings
    await this.loadSettings();
    
    // Load profiles
    await this.loadProfiles();
    
    logger.info(this.name, `Loaded ${this.profiles.size} profiles, ${this.themes.size} themes`);
  }

  async shutdown(): Promise<void> {
    logger.info(this.name, 'Shutting down Personalization Agent');
    await this.saveSettings();
  }

  protected async processTask(task: unknown): Promise<unknown> {
    const { action, ...params } = task as { action: string; [key: string]: unknown };
    
    switch (action) {
      case 'getSettings':
        return this.getGlobalSettings();
      case 'updateSettings':
        return this.updateGlobalSettings(params as Partial<GlobalSettings>);
      case 'getProfile':
        return this.getProfile(params.profileId as string);
      case 'createProfile':
        return this.createProfile(params as Partial<PersonalizationProfile>);
      case 'applyProfile':
        return this.applyProfile(params.profileId as string);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private getDefaultGlobalSettings(): GlobalSettings {
    return {
      theme: 'dark',
      language: 'en',
      autoSave: true,
      hotReload: true,
      maxVram: 6144,
      logLevel: 'info',
      notifications: true,
      shortcuts: {
        'quit': 'ctrl+q',
        'help': 'ctrl+h',
        'model': 'ctrl+m',
        'chat': 'ctrl+c',
        'tools': 'ctrl+t',
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Global Settings
  // ─────────────────────────────────────────────────────────────────────────────

  getGlobalSettings(): GlobalSettings {
    return { ...this.globalSettings };
  }

  updateGlobalSettings(updates: Partial<GlobalSettings>): GlobalSettings {
    this.globalSettings = { ...this.globalSettings, ...updates };
    this.saveSettings();
    logger.info(this.name, 'Updated global settings');
    return this.globalSettings;
  }

  getSetting<K extends keyof GlobalSettings>(key: K): GlobalSettings[K] {
    return this.globalSettings[key];
  }

  setSetting<K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]): void {
    this.globalSettings[key] = value;
    this.saveSettings();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Agent Settings
  // ─────────────────────────────────────────────────────────────────────────────

  getAgentSettings(agentId: string): AgentSettings | undefined {
    return this.agentSettings.get(agentId);
  }

  updateAgentSettings(agentId: string, updates: Partial<AgentSettings>): AgentSettings {
    const existing = this.agentSettings.get(agentId) || {
      agentId,
      enabled: true,
      priority: 5,
      maxConcurrency: 1,
      timeout: 30000,
      retryCount: 3,
      customConfig: {},
    };

    const updated = { ...existing, ...updates };
    this.agentSettings.set(agentId, updated);
    this.saveSettings();
    
    return updated;
  }

  getAllAgentSettings(): AgentSettings[] {
    return Array.from(this.agentSettings.values());
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Profiles
  // ─────────────────────────────────────────────────────────────────────────────

  async createProfile(profile: Partial<PersonalizationProfile>): Promise<PersonalizationProfile> {
    const newProfile: PersonalizationProfile = {
      id: profile.id || crypto.randomUUID(),
      name: profile.name || 'New Profile',
      description: profile.description,
      modelSettings: profile.modelSettings || {},
      agentSettings: profile.agentSettings || {},
      globalSettings: profile.globalSettings || {},
      customInstructions: profile.customInstructions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.profiles.set(newProfile.id, newProfile);
    await this.saveProfiles();
    
    logger.info(this.name, `Created profile: ${newProfile.name}`);
    return newProfile;
  }

  getProfile(profileId: string): PersonalizationProfile | undefined {
    return this.profiles.get(profileId);
  }

  getProfiles(): PersonalizationProfile[] {
    return Array.from(this.profiles.values());
  }

  async updateProfile(profileId: string, updates: Partial<PersonalizationProfile>): Promise<PersonalizationProfile | null> {
    const existing = this.profiles.get(profileId);
    if (!existing) return null;

    const updated: PersonalizationProfile = {
      ...existing,
      ...updates,
      id: profileId,
      updatedAt: new Date(),
    };

    this.profiles.set(profileId, updated);
    await this.saveProfiles();
    
    return updated;
  }

  async deleteProfile(profileId: string): Promise<boolean> {
    const deleted = this.profiles.delete(profileId);
    if (deleted) {
      await this.saveProfiles();
      if (this.activeProfileId === profileId) {
        this.activeProfileId = null;
      }
    }
    return deleted;
  }

  async applyProfile(profileId: string): Promise<boolean> {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;

    // Apply global settings
    if (profile.globalSettings) {
      this.globalSettings = { ...this.globalSettings, ...profile.globalSettings };
    }

    // Apply agent settings
    for (const [agentId, settings] of Object.entries(profile.agentSettings)) {
      this.updateAgentSettings(agentId, settings);
    }

    this.activeProfileId = profileId;
    await this.saveSettings();
    
    logger.info(this.name, `Applied profile: ${profile.name}`);
    return true;
  }

  getActiveProfile(): PersonalizationProfile | null {
    return this.activeProfileId ? this.profiles.get(this.activeProfileId) || null : null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Themes
  // ─────────────────────────────────────────────────────────────────────────────

  private loadBuiltInThemes(): void {
    // Dark Theme
    this.themes.set('dark', {
      name: 'Dark',
      colors: {
        primary: '#61afef',
        secondary: '#98c379',
        accent: '#c678dd',
        background: '#282c34',
        foreground: '#abb2bf',
        success: '#98c379',
        warning: '#e5c07b',
        error: '#e06c75',
        info: '#61afef',
        border: '#3e4451',
      },
      styles: {
        boxStyle: 'round',
        headerStyle: 'gradient',
      },
    });

    // Light Theme
    this.themes.set('light', {
      name: 'Light',
      colors: {
        primary: '#4078f2',
        secondary: '#50a14f',
        accent: '#a626a4',
        background: '#fafafa',
        foreground: '#383a42',
        success: '#50a14f',
        warning: '#c18401',
        error: '#e45649',
        info: '#4078f2',
        border: '#d3d3d3',
      },
      styles: {
        boxStyle: 'single',
        headerStyle: 'simple',
      },
    });

    // High Contrast Theme
    this.themes.set('high-contrast', {
      name: 'High Contrast',
      colors: {
        primary: '#00ff00',
        secondary: '#00ffff',
        accent: '#ff00ff',
        background: '#000000',
        foreground: '#ffffff',
        success: '#00ff00',
        warning: '#ffff00',
        error: '#ff0000',
        info: '#00ffff',
        border: '#ffffff',
      },
      styles: {
        boxStyle: 'double',
        headerStyle: 'banner',
      },
    });

    // TOON Theme
    this.themes.set('toon', {
      name: 'TOON',
      colors: {
        primary: '#ff6b6b',
        secondary: '#4ecdc4',
        accent: '#ffe66d',
        background: '#2c3e50',
        foreground: '#ecf0f1',
        success: '#2ecc71',
        warning: '#f39c12',
        error: '#e74c3c',
        info: '#3498db',
        border: '#95a5a6',
      },
      styles: {
        boxStyle: 'bold',
        headerStyle: 'gradient',
      },
    });
  }

  getTheme(themeName: string): Theme | undefined {
    return this.themes.get(themeName);
  }

  getThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  getCurrentTheme(): Theme {
    return this.themes.get(this.globalSettings.theme) || this.themes.get('dark')!;
  }

  setTheme(themeName: string): boolean {
    if (!this.themes.has(themeName)) return false;
    this.globalSettings.theme = themeName as GlobalSettings['theme'];
    this.saveSettings();
    logger.info(this.name, `Theme changed to: ${themeName}`);
    return true;
  }

  registerTheme(theme: Theme): void {
    this.themes.set(theme.name.toLowerCase(), theme);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Instructions
  // ─────────────────────────────────────────────────────────────────────────────

  getCustomInstructions(): string[] {
    const profile = this.getActiveProfile();
    return profile?.customInstructions || [];
  }

  addCustomInstruction(instruction: string): void {
    const profile = this.getActiveProfile();
    if (profile) {
      profile.customInstructions.push(instruction);
      this.saveProfiles();
    }
  }

  removeCustomInstruction(index: number): boolean {
    const profile = this.getActiveProfile();
    if (profile && index >= 0 && index < profile.customInstructions.length) {
      profile.customInstructions.splice(index, 1);
      this.saveProfiles();
      return true;
    }
    return false;
  }

  // Build system prompt with custom instructions
  buildSystemPrompt(basePrompt: string): string {
    const instructions = this.getCustomInstructions();
    if (instructions.length === 0) return basePrompt;

    return `${basePrompt}\n\n## Custom Instructions\n${instructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Shortcuts
  // ─────────────────────────────────────────────────────────────────────────────

  getShortcuts(): Record<string, string> {
    return { ...this.globalSettings.shortcuts };
  }

  setShortcut(action: string, shortcut: string): void {
    this.globalSettings.shortcuts[action] = shortcut;
    this.saveSettings();
  }

  removeShortcut(action: string): void {
    delete this.globalSettings.shortcuts[action];
    this.saveSettings();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────────────────

  private async loadSettings(): Promise<void> {
    try {
      const settingsPath = path.join(this.configPath, 'settings.json');
      const content = await fs.readFile(settingsPath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.globalSettings) {
        this.globalSettings = { ...this.getDefaultGlobalSettings(), ...data.globalSettings };
      }
      if (data.agentSettings) {
        for (const [id, settings] of Object.entries(data.agentSettings)) {
          this.agentSettings.set(id, settings as AgentSettings);
        }
      }
      if (data.activeProfileId) {
        this.activeProfileId = data.activeProfileId;
      }
    } catch (error) {
      // Use defaults if no settings file exists
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const settingsPath = path.join(this.configPath, 'settings.json');
      const data = {
        globalSettings: this.globalSettings,
        agentSettings: Object.fromEntries(this.agentSettings),
        activeProfileId: this.activeProfileId,
      };
      await fs.writeFile(settingsPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(this.name, 'Failed to save settings', error);
    }
  }

  private async loadProfiles(): Promise<void> {
    try {
      const profilesPath = path.join(this.configPath, 'profiles.json');
      const content = await fs.readFile(profilesPath, 'utf-8');
      const profiles = JSON.parse(content) as PersonalizationProfile[];
      
      for (const profile of profiles) {
        this.profiles.set(profile.id, {
          ...profile,
          createdAt: new Date(profile.createdAt),
          updatedAt: new Date(profile.updatedAt),
        });
      }
    } catch (error) {
      // No profiles file exists yet
    }
  }

  private async saveProfiles(): Promise<void> {
    try {
      const profilesPath = path.join(this.configPath, 'profiles.json');
      const profiles = Array.from(this.profiles.values());
      await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2));
    } catch (error) {
      logger.error(this.name, 'Failed to save profiles', error);
    }
  }

  // Export all settings
  async exportSettings(filePath: string): Promise<void> {
    const data = {
      globalSettings: this.globalSettings,
      agentSettings: Object.fromEntries(this.agentSettings),
      profiles: Array.from(this.profiles.values()),
      activeProfileId: this.activeProfileId,
    };
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    logger.info(this.name, `Exported settings to ${filePath}`);
  }

  // Import settings
  async importSettings(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (data.globalSettings) {
      this.globalSettings = { ...this.getDefaultGlobalSettings(), ...data.globalSettings };
    }
    if (data.agentSettings) {
      for (const [id, settings] of Object.entries(data.agentSettings)) {
        this.agentSettings.set(id, settings as AgentSettings);
      }
    }
    if (data.profiles) {
      for (const profile of data.profiles) {
        this.profiles.set(profile.id, {
          ...profile,
          createdAt: new Date(profile.createdAt),
          updatedAt: new Date(profile.updatedAt),
        });
      }
    }
    
    await this.saveSettings();
    await this.saveProfiles();
    logger.info(this.name, `Imported settings from ${filePath}`);
  }
}

export default PersonalizationAgent;
