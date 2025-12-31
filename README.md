# 🚀 SuperCode - Ultimate Developer-Oriented CLI & TUI AI Platform

<div align="center">

```
███████╗██╗   ██╗██████╗ ███████╗██████╗  ██████╗ ██████╗ ██████╗ ███████╗
██╔════╝██║   ██║██╔══██╗██╔════╝██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝
███████╗██║   ██║██████╔╝█████╗  ██████╔╝██║     ██║   ██║██║  ██║█████╗  
╚════██║██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗██║     ██║   ██║██║  ██║██╔══╝  
███████║╚██████╔╝██║     ███████╗██║  ██║╚██████╗╚██████╔╝██████╔╝███████╗
╚══════╝ ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
```

**Full-featured, sub-agent-centric, highly modular, local AI dev & orchestration environment for advanced developers.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

## ✨ Features

### 🎯 Sub-Agent Architecture (12 Specialized Agents)
- **SupervisorAgent** - Master orchestrator for all sub-agents
- **ModelRouterAgent** - Smart LLM selection by task, VRAM, latency
- **ToolsManagerAgent** - Manage 100+ tools dynamically
- **FunctionsAgent** - Manage 100+ functions with runtime execution
- **MemoryAgent** - Persistent multi-agent memory (SQLite)
- **KnowledgeAgent** - RAG + KB integration, document versioning
- **WorkflowPlannerAgent** - Multi-step workflows, LangGraph integration
- **TodoManagerAgent** - Multi-file task & code planner
- **ChatSessionManagerAgent** - Save/load/export/import chats
- **ObservabilityAgent** - Logging, metrics, error forwarding
- **PersonalizationAgent** - Agent-level tuning, themes
- **SecurityAgent** - Token & secret management
- **IntegrationAgent** - External LLMs, APIs, databases

### 🔧 CLI/TUI Commands
| Command | Description |
|---------|-------------|
| `/model` | Model list, attach/detach, personalize, tuning |
| `/chat` | All chat sessions, export/import/search, merge |
| `/tools` | 100+ tools, toggle attach/detach, runtime config |
| `/functions` | 100+ functions, runtime execution, attach/detach |
| `/workflows` | Multi-step workflows, LangGraph + LangFlow integration |
| `/mcp` | 50+ local MCP servers, start/stop/config/monitor |
| `/agent` | Supervisor & SubAgent status, live metrics |
| `/memory` | View, edit, clear, backup, sync across agents |
| `/knowledge` | Persistent KB, RAG, document retrieval |
| `/planner` | Todo & task manager, multi-file code scheduling |
| `/settings` | Global & agent-specific config, hot reload |
| `/themes` | IDE themes, TUI themes, light/dark/high-contrast |
| `/debug` | Observability, logging, retry, error events |
| `/security` | Permission control, token & secret management |
| `/integration` | Integrate external LLMs, APIs, data sources |
| `/help` | Interactive hints, tooltips, example commands |
| `/quit` | Exit SuperCode |

### 🤖 Local Model Strategy
- **Small Models** (~33-100M) - Embeddings, lightweight reasoning
- **Medium Models** (3-5GB) - Multi-step coding, workflows
- **Large Models** (>6GB) - Batch processing, heavy computation
- **Smart Routing** - Automatically selects optimal model per task & VRAM

### 🔌 MCP Server Support (48 Pre-configured)
- **Development**: Filesystem, Git, GitHub, GitLab, Bitbucket
- **Containers**: Docker, Kubernetes
- **Databases**: PostgreSQL, MySQL, SQLite, Redis, MongoDB, Neo4j
- **Communication**: Slack, Discord, Email
- **Productivity**: Notion, Linear, Todoist, Google Drive
- **Browser**: Puppeteer, Playwright, Browserbase
- **Cloud**: AWS, GCP, Azure, Cloudflare
- **AI**: OpenAI, Anthropic, Perplexity
- And many more...

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-org/supercode.git
cd supercode

# Install dependencies
npm install

# Build the project
npm run build

# Run SuperCode
npm start
```

## 🚀 Quick Start

```bash
# Start interactive mode
npx supercode start

# Or run a single command
npx supercode run "/agent list"

# List available models
npx supercode models

# List available tools
npx supercode tools

# Show agent status
npx supercode agents
```

## 🎨 Interactive Mode

When you start SuperCode in interactive mode, you'll see a dashboard with:
- Agent status (12 agents running)
- Available models
- Attached tools
- MCP server status
- Memory entries
- Pending tasks

## 🏗️ Project Structure

```
supercode/
├── src/
│   ├── index.ts                  # Main entry point
│   ├── agents/
│   │   ├── baseAgent.ts          # Base agent class
│   │   ├── supervisorAgent.ts    # Master orchestrator
│   │   ├── modelRouterAgent.ts   # Smart model selection
│   │   ├── toolsManagerAgent.ts  # Tools management
│   │   ├── functionsAgent.ts     # Functions management
│   │   ├── memoryAgent.ts        # Persistent memory
│   │   ├── knowledgeAgent.ts     # Knowledge base & RAG
│   │   ├── workflowPlannerAgent.ts # Workflow orchestration
│   │   ├── todoManagerAgent.ts   # Task management
│   │   ├── chatSessionManagerAgent.ts # Chat sessions
│   │   ├── observabilityAgent.ts # Logging & metrics
│   │   ├── personalizationAgent.ts # Themes & settings
│   │   ├── securityAgent.ts      # Security & secrets
│   │   └── integrationAgent.ts   # External integrations
│   ├── mcp/
│   │   └── mcpManager.ts         # MCP server management
│   ├── tui/
│   │   └── ui.ts                 # TUI interface
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   └── utils/
│       ├── eventBus.ts           # Event system
│       └── logger.ts             # TOON-style logging
├── .voltagent/                   # Data directory
│   ├── memory.db                 # Memory database
│   └── observability.db          # Logs database
├── package.json
├── tsconfig.json
└── tsdown.config.ts
```

## 🔧 Configuration

### Environment Variables

```bash
# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Local LLM Endpoints
OLLAMA_HOST=http://localhost:11434
LMSTUDIO_HOST=http://localhost:1234

# Database
SUPERCODE_DATA_DIR=.voltagent
```

### Settings

Use `/settings` command to configure:
- Default model
- Theme (dark, light, high-contrast, toon)
- Log level
- Auto-save interval
- And more...

## 🎯 Optimized for RTX 3050 6GB VRAM

SuperCode is designed to work efficiently on consumer hardware:
- Smart model routing based on available VRAM
- Automatic model offloading
- Efficient memory management
- Local-first architecture

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

<div align="center">
Made with ❤️ by the SuperCode Team
</div>
