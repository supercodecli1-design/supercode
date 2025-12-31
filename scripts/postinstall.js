#!/usr/bin/env node
import { mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const configDir = join(homedir(), '.supercode');

if (!existsSync(configDir)) {
  mkdirSync(configDir, { recursive: true });
  console.log('✅ SuperCode config directory created at:', configDir);
}

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 SuperCode CLI installed successfully!                    ║
║                                                               ║
║   Run 'supercode' or 'sc' to start                           ║
║                                                               ║
║   Quick commands:                                             ║
║     supercode start    - Start interactive TUI               ║
║     supercode --help   - Show all commands                   ║
║     supercode config   - Configure settings                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
