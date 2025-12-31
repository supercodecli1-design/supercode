/**
 * ⌨️ SuperCode Keyboard Shortcuts System
 * Fully customizable keyboard shortcuts with vim-like and IDE-like bindings
 */

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: string;
  description: string;
  category: ShortcutCategory;
}

export type ShortcutCategory = 
  | 'navigation'
  | 'editing'
  | 'view'
  | 'agents'
  | 'tools'
  | 'chat'
  | 'system'
  | 'custom';

export interface ShortcutPreset {
  name: string;
  displayName: string;
  description: string;
  shortcuts: Shortcut[];
}

// Default shortcuts (IDE-like)
export const defaultShortcuts: Shortcut[] = [
  // Navigation
  { key: 'up', action: 'navigate:up', description: 'Move up', category: 'navigation' },
  { key: 'down', action: 'navigate:down', description: 'Move down', category: 'navigation' },
  { key: 'left', action: 'navigate:left', description: 'Move left', category: 'navigation' },
  { key: 'right', action: 'navigate:right', description: 'Move right', category: 'navigation' },
  { key: 'tab', action: 'navigate:next-panel', description: 'Next panel', category: 'navigation' },
  { key: 'tab', shift: true, action: 'navigate:prev-panel', description: 'Previous panel', category: 'navigation' },
  { key: 'enter', action: 'navigate:select', description: 'Select item', category: 'navigation' },
  { key: 'escape', action: 'navigate:back', description: 'Go back / Cancel', category: 'navigation' },
  { key: 'home', action: 'navigate:first', description: 'Go to first item', category: 'navigation' },
  { key: 'end', action: 'navigate:last', description: 'Go to last item', category: 'navigation' },
  { key: 'pageup', action: 'navigate:page-up', description: 'Page up', category: 'navigation' },
  { key: 'pagedown', action: 'navigate:page-down', description: 'Page down', category: 'navigation' },
  
  // Quick navigation with numbers
  { key: '1', alt: true, action: 'panel:agents', description: 'Go to Agents panel', category: 'navigation' },
  { key: '2', alt: true, action: 'panel:models', description: 'Go to Models panel', category: 'navigation' },
  { key: '3', alt: true, action: 'panel:tools', description: 'Go to Tools panel', category: 'navigation' },
  { key: '4', alt: true, action: 'panel:chat', description: 'Go to Chat panel', category: 'navigation' },
  { key: '5', alt: true, action: 'panel:memory', description: 'Go to Memory panel', category: 'navigation' },
  { key: '6', alt: true, action: 'panel:workflows', description: 'Go to Workflows panel', category: 'navigation' },
  { key: '7', alt: true, action: 'panel:mcp', description: 'Go to MCP panel', category: 'navigation' },
  { key: '8', alt: true, action: 'panel:logs', description: 'Go to Logs panel', category: 'navigation' },
  { key: '9', alt: true, action: 'panel:settings', description: 'Go to Settings panel', category: 'navigation' },
  
  // View controls
  { key: 'f', ctrl: true, action: 'view:search', description: 'Search / Find', category: 'view' },
  { key: 'g', ctrl: true, action: 'view:goto', description: 'Go to...', category: 'view' },
  { key: 'p', ctrl: true, action: 'view:command-palette', description: 'Command palette', category: 'view' },
  { key: 'b', ctrl: true, action: 'view:toggle-sidebar', description: 'Toggle sidebar', category: 'view' },
  { key: '`', ctrl: true, action: 'view:toggle-terminal', description: 'Toggle terminal', category: 'view' },
  { key: 'j', ctrl: true, action: 'view:toggle-panel', description: 'Toggle bottom panel', category: 'view' },
  { key: '+', ctrl: true, action: 'view:zoom-in', description: 'Zoom in', category: 'view' },
  { key: '-', ctrl: true, action: 'view:zoom-out', description: 'Zoom out', category: 'view' },
  { key: '0', ctrl: true, action: 'view:zoom-reset', description: 'Reset zoom', category: 'view' },
  { key: 'f11', action: 'view:fullscreen', description: 'Toggle fullscreen', category: 'view' },
  { key: '\\', ctrl: true, action: 'view:split', description: 'Split view', category: 'view' },
  
  // Agent controls
  { key: 'a', ctrl: true, action: 'agent:list', description: 'List all agents', category: 'agents' },
  { key: 'a', ctrl: true, shift: true, action: 'agent:start-all', description: 'Start all agents', category: 'agents' },
  { key: 's', ctrl: true, shift: true, action: 'agent:stop-all', description: 'Stop all agents', category: 'agents' },
  { key: 'r', ctrl: true, action: 'agent:restart', description: 'Restart selected agent', category: 'agents' },
  { key: 'd', ctrl: true, action: 'agent:details', description: 'Show agent details', category: 'agents' },
  
  // Tool controls
  { key: 't', ctrl: true, action: 'tool:list', description: 'List all tools', category: 'tools' },
  { key: 't', ctrl: true, shift: true, action: 'tool:run', description: 'Run selected tool', category: 'tools' },
  { key: 'e', ctrl: true, action: 'tool:toggle', description: 'Enable/disable tool', category: 'tools' },
  
  // Chat controls
  { key: 'n', ctrl: true, action: 'chat:new', description: 'New chat session', category: 'chat' },
  { key: 'o', ctrl: true, action: 'chat:open', description: 'Open chat session', category: 'chat' },
  { key: 's', ctrl: true, action: 'chat:save', description: 'Save chat session', category: 'chat' },
  { key: 'e', ctrl: true, shift: true, action: 'chat:export', description: 'Export chat', category: 'chat' },
  { key: 'l', ctrl: true, action: 'chat:clear', description: 'Clear chat', category: 'chat' },
  { key: 'h', ctrl: true, action: 'chat:history', description: 'Chat history', category: 'chat' },
  
  // System controls
  { key: ',', ctrl: true, action: 'system:settings', description: 'Open settings', category: 'system' },
  { key: 'k', ctrl: true, action: 'system:shortcuts', description: 'Show shortcuts', category: 'system' },
  { key: '?', action: 'system:help', description: 'Show help', category: 'system' },
  { key: 'q', ctrl: true, action: 'system:quit', description: 'Quit SuperCode', category: 'system' },
  { key: 'r', ctrl: true, shift: true, action: 'system:reload', description: 'Reload configuration', category: 'system' },
  { key: 'u', ctrl: true, action: 'system:update', description: 'Check for updates', category: 'system' },
  { key: 'i', ctrl: true, action: 'system:info', description: 'System info', category: 'system' },
  
  // Editing
  { key: 'c', ctrl: true, action: 'edit:copy', description: 'Copy', category: 'editing' },
  { key: 'v', ctrl: true, action: 'edit:paste', description: 'Paste', category: 'editing' },
  { key: 'x', ctrl: true, action: 'edit:cut', description: 'Cut', category: 'editing' },
  { key: 'z', ctrl: true, action: 'edit:undo', description: 'Undo', category: 'editing' },
  { key: 'z', ctrl: true, shift: true, action: 'edit:redo', description: 'Redo', category: 'editing' },
  { key: 'a', ctrl: true, action: 'edit:select-all', description: 'Select all', category: 'editing' },
  { key: 'delete', action: 'edit:delete', description: 'Delete', category: 'editing' },
  { key: 'backspace', action: 'edit:backspace', description: 'Backspace', category: 'editing' },
];

// Vim-like shortcuts preset
export const vimShortcuts: Shortcut[] = [
  // Navigation (vim-style)
  { key: 'j', action: 'navigate:down', description: 'Move down', category: 'navigation' },
  { key: 'k', action: 'navigate:up', description: 'Move up', category: 'navigation' },
  { key: 'h', action: 'navigate:left', description: 'Move left', category: 'navigation' },
  { key: 'l', action: 'navigate:right', description: 'Move right', category: 'navigation' },
  { key: 'g', action: 'navigate:first', description: 'Go to first', category: 'navigation' },
  { key: 'G', shift: true, action: 'navigate:last', description: 'Go to last', category: 'navigation' },
  { key: 'w', action: 'navigate:next-word', description: 'Next word', category: 'navigation' },
  { key: 'b', action: 'navigate:prev-word', description: 'Previous word', category: 'navigation' },
  { key: '/', action: 'view:search', description: 'Search', category: 'view' },
  { key: 'n', action: 'view:search-next', description: 'Next search result', category: 'view' },
  { key: 'N', shift: true, action: 'view:search-prev', description: 'Previous search result', category: 'view' },
  { key: ':', action: 'view:command-palette', description: 'Command mode', category: 'view' },
  { key: 'i', action: 'mode:insert', description: 'Insert mode', category: 'editing' },
  { key: 'escape', action: 'mode:normal', description: 'Normal mode', category: 'editing' },
  { key: 'v', action: 'mode:visual', description: 'Visual mode', category: 'editing' },
  { key: 'd', action: 'edit:delete', description: 'Delete', category: 'editing' },
  { key: 'y', action: 'edit:yank', description: 'Yank (copy)', category: 'editing' },
  { key: 'p', action: 'edit:paste', description: 'Paste', category: 'editing' },
  { key: 'u', action: 'edit:undo', description: 'Undo', category: 'editing' },
  { key: 'r', ctrl: true, action: 'edit:redo', description: 'Redo', category: 'editing' },
  { key: 'q', action: 'system:quit', description: 'Quit', category: 'system' },
  { key: 'w', ctrl: true, action: 'chat:save', description: 'Save', category: 'chat' },
];

// Emacs-like shortcuts preset
export const emacsShortcuts: Shortcut[] = [
  // Navigation (emacs-style)
  { key: 'n', ctrl: true, action: 'navigate:down', description: 'Next line', category: 'navigation' },
  { key: 'p', ctrl: true, action: 'navigate:up', description: 'Previous line', category: 'navigation' },
  { key: 'b', ctrl: true, action: 'navigate:left', description: 'Backward char', category: 'navigation' },
  { key: 'f', ctrl: true, action: 'navigate:right', description: 'Forward char', category: 'navigation' },
  { key: 'a', ctrl: true, action: 'navigate:line-start', description: 'Beginning of line', category: 'navigation' },
  { key: 'e', ctrl: true, action: 'navigate:line-end', description: 'End of line', category: 'navigation' },
  { key: 'v', ctrl: true, action: 'navigate:page-down', description: 'Page down', category: 'navigation' },
  { key: 'v', alt: true, action: 'navigate:page-up', description: 'Page up', category: 'navigation' },
  { key: '<', alt: true, action: 'navigate:first', description: 'Beginning of buffer', category: 'navigation' },
  { key: '>', alt: true, action: 'navigate:last', description: 'End of buffer', category: 'navigation' },
  { key: 's', ctrl: true, action: 'view:search', description: 'Search forward', category: 'view' },
  { key: 'r', ctrl: true, action: 'view:search-backward', description: 'Search backward', category: 'view' },
  { key: 'x', ctrl: true, action: 'view:command-palette', description: 'Execute command', category: 'view' },
  { key: 'g', ctrl: true, action: 'navigate:back', description: 'Cancel', category: 'navigation' },
  { key: 'd', ctrl: true, action: 'edit:delete', description: 'Delete char', category: 'editing' },
  { key: 'k', ctrl: true, action: 'edit:kill-line', description: 'Kill line', category: 'editing' },
  { key: 'y', ctrl: true, action: 'edit:yank', description: 'Yank', category: 'editing' },
  { key: 'w', ctrl: true, action: 'edit:cut', description: 'Kill region', category: 'editing' },
  { key: 'w', alt: true, action: 'edit:copy', description: 'Copy region', category: 'editing' },
  { key: '/', ctrl: true, action: 'edit:undo', description: 'Undo', category: 'editing' },
];

// Shortcut presets
export const shortcutPresets: Record<string, ShortcutPreset> = {
  default: {
    name: 'default',
    displayName: 'Default (IDE-like)',
    description: 'Standard IDE keyboard shortcuts similar to VS Code',
    shortcuts: defaultShortcuts,
  },
  vim: {
    name: 'vim',
    displayName: 'Vim',
    description: 'Vim-style modal editing shortcuts',
    shortcuts: [...vimShortcuts, ...defaultShortcuts.filter(s => s.category === 'system')],
  },
  emacs: {
    name: 'emacs',
    displayName: 'Emacs',
    description: 'Emacs-style shortcuts',
    shortcuts: [...emacsShortcuts, ...defaultShortcuts.filter(s => s.category === 'system')],
  },
};

export class ShortcutManager {
  private shortcuts: Map<string, Shortcut> = new Map();
  private customShortcuts: Map<string, Shortcut> = new Map();
  private currentPreset: string = 'default';
  private handlers: Map<string, () => void> = new Map();

  constructor(preset: string = 'default') {
    this.loadPreset(preset);
  }

  loadPreset(presetName: string): void {
    const preset = shortcutPresets[presetName];
    if (!preset) {
      console.warn(`Preset "${presetName}" not found, using default`);
      this.loadPreset('default');
      return;
    }

    this.shortcuts.clear();
    this.currentPreset = presetName;

    for (const shortcut of preset.shortcuts) {
      const key = this.getShortcutKey(shortcut);
      this.shortcuts.set(key, shortcut);
    }

    // Apply custom shortcuts on top
    for (const [key, shortcut] of this.customShortcuts) {
      this.shortcuts.set(key, shortcut);
    }
  }

  private getShortcutKey(shortcut: Shortcut): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.alt) parts.push('alt');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.meta) parts.push('meta');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  addCustomShortcut(shortcut: Shortcut): void {
    const key = this.getShortcutKey(shortcut);
    shortcut.category = 'custom';
    this.customShortcuts.set(key, shortcut);
    this.shortcuts.set(key, shortcut);
  }

  removeCustomShortcut(shortcut: Shortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.customShortcuts.delete(key);
    
    // Restore original shortcut if exists
    const preset = shortcutPresets[this.currentPreset];
    const original = preset.shortcuts.find(s => this.getShortcutKey(s) === key);
    if (original) {
      this.shortcuts.set(key, original);
    } else {
      this.shortcuts.delete(key);
    }
  }

  registerHandler(action: string, handler: () => void): void {
    this.handlers.set(action, handler);
  }

  unregisterHandler(action: string): void {
    this.handlers.delete(action);
  }

  handleKeyPress(key: string, ctrl: boolean, alt: boolean, shift: boolean, meta: boolean): boolean {
    const parts: string[] = [];
    if (ctrl) parts.push('ctrl');
    if (alt) parts.push('alt');
    if (shift) parts.push('shift');
    if (meta) parts.push('meta');
    parts.push(key.toLowerCase());
    
    const shortcutKey = parts.join('+');
    const shortcut = this.shortcuts.get(shortcutKey);
    
    if (shortcut) {
      const handler = this.handlers.get(shortcut.action);
      if (handler) {
        handler();
        return true;
      }
    }
    
    return false;
  }

  getShortcutForAction(action: string): Shortcut | undefined {
    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.action === action) {
        return shortcut;
      }
    }
    return undefined;
  }

  formatShortcut(shortcut: Shortcut): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.meta) parts.push('⌘');
    
    // Format key name
    let keyName = shortcut.key;
    if (keyName.length === 1) {
      keyName = keyName.toUpperCase();
    } else {
      keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);
    }
    parts.push(keyName);
    
    return parts.join('+');
  }

  getAllShortcuts(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutsByCategory(category: ShortcutCategory): Shortcut[] {
    return this.getAllShortcuts().filter(s => s.category === category);
  }

  getCurrentPreset(): string {
    return this.currentPreset;
  }

  getAvailablePresets(): Array<{ name: string; displayName: string; description: string }> {
    return Object.values(shortcutPresets).map(p => ({
      name: p.name,
      displayName: p.displayName,
      description: p.description,
    }));
  }

  exportConfig(): object {
    return {
      preset: this.currentPreset,
      customShortcuts: Array.from(this.customShortcuts.values()),
    };
  }

  importConfig(config: { preset?: string; customShortcuts?: Shortcut[] }): void {
    if (config.preset) {
      this.loadPreset(config.preset);
    }
    if (config.customShortcuts) {
      for (const shortcut of config.customShortcuts) {
        this.addCustomShortcut(shortcut);
      }
    }
  }
}

export const shortcutManager = new ShortcutManager();
