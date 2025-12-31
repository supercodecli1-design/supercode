# supercode

🎨 Project: SuperCode / OpenHands Agent – Ultimate Developer-Oriented CLI & TUI AI Platform
💻 Stack: Node.js + TypeScript (CLI) + Python (AI Brain)
🎯 Goal: Full-featured, sub-agent-centric, highly modular, local AI dev & orchestration environment for advanced developers.

┌─────────────────────────────────────────┐
│ GLOBAL CLI / TUI OVERVIEW                │
├─────────────────────────────────────────┤
│ Menus & Items:                           │
│ /model        → Model list, attach/detach, personalize, tuning │
│ /chat         → All chat sessions, export/import/search, merge │
│ /tools        → 100+ tools, toggle attach/detach, runtime config │
│ /functions    → 100+ functions, runtime execution, attach/detach │
│ /workflows    → Multi-step workflows, attach/detach, LangGraph + LangFlow integration │
│ /mcp          → 50+ local MCP servers, start/stop/config/monitor │
│ /agent        → Supervisor & SubAgent status, live metrics, attach/detach │
│ /memory       → View, edit, clear, backup, sync across agents │
│ /knowledge    → Persistent KB, RAG, document retrieval, versioning │
│ /planner      → Todo & task manager, multi-file code scheduling, priority queues │
│ /export       → Export configs, workflows, tools, functions, chat sessions │
│ /import       → Import configs, workflows, tools, functions, chat sessions │
│ /settings     → Global & agent-specific config, hot reload, personalization │
│ /themes       → IDE themes, TUI themes, light/dark/high-contrast │
│ /debug        → Observability, logging, retry, error events, metrics │
│ /help         → Interactive hints, tooltips, example commands │
│ /notifications → Runtime notifications, task alerts, MCP events │
│ /updates      → Check & update models, tools, workflows automatically │
│ /integration  → Integrate external LLMs, APIs, data sources │
│ /shortcuts    → Custom keyboard shortcuts, macro actions │
│ /security     → Permission control, token & secret management │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ SUB-AGENT ARCHITECTURE (Advanced)        │
├─────────────────────────────────────────┤
│ SupervisorAgent                           │
│ - Orchestrates all sub-agents, routing, logging, error handling │
│ - Auto-detect & attach new models, tools, functions │
│                                           │
│ SubAgents (Full Modular List)            │
│ 1️⃣ ModelRouterAgent                        │
│    - Smart LLM selection by task, VRAM, latency │
│    - Local Ollama, LMStudio, GGUF, llama.cpp integration │
│    - Personalization & tuning per agent  │
│ 2️⃣ ToolsManagerAgent                       │
│    - Manage 100+ tools dynamically       │
│    - Hot reload & attach/detach          │
│ 3️⃣ FunctionsAgent                          │
│    - Manage 100+ functions dynamically   │
│    - Inline execution, validation, runtime hooks │
│ 4️⃣ MemoryAgent                             │
│    - Persistent multi-agent memory (LibSQL/SQLite) │
│    - Search, merge, backup, multi-user support │
│ 5️⃣ KnowledgeAgent                           │
│    - RAG + KB integration, document versioning │
│    - Search, retrieval, augmentation     │
│ 6️⃣ WorkflowPlannerAgent                     │
│    - Multi-step workflows, LangGraph & LangFlow │
│    - Planner + Todo integration           │
│ 7️⃣ TodoManagerAgent                          │
│    - Multi-file task & code planner       │
│    - Priority, reminders, auto-scheduling │
│ 8️⃣ ChatSessionManagerAgent                   │
│    - Save/load/export/import chats        │
│    - Merge & split chat sessions          │
│ 9️⃣ ObservabilityAgent                        │
│    - Logging, metrics, error forwarding, retry │
│    - FullStream forwarding for debug      │
│ 🔟 PersonalizationAgent                        │
│    - Agent-level tuning, instruction injection │
│    - Behavior & style configuration       │
│ 1️⃣1️⃣ SecurityAgent                             │
│    - Token & secret management             │
│    - Access control per agent/module       │
│ 1️⃣2️⃣ IntegrationAgent                          │
│    - External LLMs, APIs, databases integration │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ LOCAL MODEL STRATEGY (Smart Routing)     │
├─────────────────────────────────────────┤
│ Small Models (~33-100M, e.g., all-minilm 33M) │
│ - Embeddings, lightweight reasoning, real-time responses │
│ Medium Models (3-5GB, e.g., deepseek-coder, qwen-coder-pro) │
│ - Multi-step coding, workflows, text analysis │
│ Large Models (>6GB, e.g., qwen3-vl, gemma3n4b) │
│ - Batch processing, heavy computation, multi-agent orchestration │
│ Smart routing automatically selects optimal model per task & VRAM │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ADVANCED FUNCTIONALITY & CAPABILITIES  │
├─────────────────────────────────────────┤
│ - Full sub-agent orchestration & modularity │
│ - Attach/detach & hot reload: tools, functions, models │
│ - Persistent memory & RAG knowledge base │
│ - Multi-step workflow orchestration with planner & todo │
│ - Full chat session history (import/export/search) │
│ - Observability with metrics, logging, retry, event forwarding │
│ - Multi-model & multi-task orchestration │
│ - Personalization & instruction tuning per sub-agent │
│ - Model router for VRAM-aware task optimization │
│ - 100+ tools, 100+ functions ready to attach │
│ - 50+ MCP servers fully local, modular & monitored │
│ - Multi-theme, IDE-like TUI (interactive hints & tooltips) │
│ - Planner & Todo: multi-file task execution, scheduling, reminders │
│ - Security: token management, agent-level permissions │
│ - Integration: external LLMs, APIs, DB, embeddings │
│ - Hot-reloadable config & settings per agent/module │
│ - Fully local, modular, no Docker dependency │
│ - Optimized for RTX3050 6GB VRAM │
│ - TOON-style visual formatting, highly readable CLI/TUI │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ PROJECT TREE (Ultimate Suggestion)      │
├─────────────────────────────────────────┤
supercode/
├─ src/
│  ├─ index.ts                  # Global CLI init & agent bootstrap
│  ├─ agents/
│  │   ├─ supervisorAgent.ts
│  │   ├─ modelRouterAgent.ts
│  │   ├─ toolsManagerAgent.ts
│  │   ├─ functionsAgent.ts
│  │   ├─ memoryAgent.ts
│  │   ├─ knowledgeAgent.ts
│  │   ├─ workflowPlannerAgent.ts
│  │   ├─ todoManagerAgent.ts
│  │   ├─ chatSessionManagerAgent.ts
│  │   ├─ observabilityAgent.ts
│  │   ├─ personalizationAgent.ts
│  │   ├─ securityAgent.ts
│  │   └─ integrationAgent.ts
│  ├─ workflows/
│  │   ├─ expenseApprovalWorkflow.ts
│  │   ├─ codeGenerationWorkflow.ts
│  │   ├─ multiStepPlannerWorkflow.ts
│  │   └─ automationWorkflows/
│  ├─ tools/
│  │   ├─ weatherTool.ts
│  │   ├─ fileTool.ts
│  │   └─ ...100 tools
│  ├─ functions/
│  │   ├─ formatFunction.ts
│  │   └─ ...100 functions
│  ├─ models/
│  │   └─ modelConfigs.ts
│  ├─ memory/
│  │   └─ memoryInit.ts
│  ├─ knowledge/
│  │   └─ knowledgeBaseInit.ts
│  └─ observability/
│      └─ logger.ts
├─ .voltagent/
│  ├─ memory.db
│  └─ observability.db
├─ tsconfig.json
├─ package.json
├─ tsdown.config.ts
├─ Dockerfile (optional)
└─ README.md

PROMPT EXECUTION INSTRUCTIONS (Ultimate Version):

1️⃣ Auto-load SubAgents and Supervisor orchestrates them.  
2️⃣ Detect & classify all local LLMs (Ollama, LMStudio, GGUF, llama.cpp) → /model menu.  
3️⃣ Attach 100+ tools & 100+ functions dynamically → /tools & /functions menu.  
4️⃣ Initialize 50+ MCP servers, attach & monitor → /mcp menu.  
5️⃣ Persistent memory & knowledge base, RAG enabled, personal tuning available → /memory & /knowledge menu.  
6️⃣ Build TUI with multi-theme IDE look, attach/detach toggles per item.  
7️⃣ Chat session management: export/import/search/merge → /chat menu.  
8️⃣ Workflow orchestration: LangGraph + LangFlow, multi-step, planner integration → /workflows & /planner menu.  
9️⃣ Planner & Todo system: multi-file tasks, scheduling, priority, reminders → /planner menu.  
🔟 Observability: logging, metrics, retry, error forwarding, fullStream → /debug menu.  
1️⃣1️⃣ Model personalization & prompt tuning → /settings menu.  
1️⃣2️⃣ Smart model routing based on task, VRAM, model size → automatic.  
1️⃣3️⃣ Attach/detach modularity for tools, functions, workflows, MCP servers.  
1️⃣4️⃣ Security: token management & agent-level permissions → /security menu.  
1️⃣5️⃣ Integration: external APIs, LLMs, DB → /integration menu.  
1️⃣6️⃣ Hot-reloadable configuration → /settings menu.  
1️⃣7️⃣ Fully local, no Docker dependency required, optimized for RTX3050 6GB VRAM.  
1️⃣8️⃣ TOON-style interactive visual formatting.  
1️⃣9️⃣ Multi-agent collaboration & cross-agent event forwarding.  
2️⃣0️⃣ Real-time, incremental, high-speed execution, optimized for multi-task, multi-file projects.  

END OF ULTIMATE PROMPT – Ready for Maximum Developer Power & SubAgent Orchestration 🚀

