// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Agents Index
// Export all agents for easy importing
// ═══════════════════════════════════════════════════════════════════════════════

export { BaseAgent } from './baseAgent.js';
export { SupervisorAgent } from './supervisorAgent.js';
export { ModelRouterAgent } from './modelRouterAgent.js';
export { ToolsManagerAgent } from './toolsManagerAgent.js';
export { FunctionsAgent } from './functionsAgent.js';
export { MemoryAgent } from './memoryAgent.js';
export { KnowledgeAgent } from './knowledgeAgent.js';
export { WorkflowPlannerAgent } from './workflowPlannerAgent.js';
export { TodoManagerAgent } from './todoManagerAgent.js';
export { ChatSessionManagerAgent } from './chatSessionManagerAgent.js';
export { ObservabilityAgent } from './observabilityAgent.js';
export { PersonalizationAgent } from './personalizationAgent.js';
export { SecurityAgent } from './securityAgent.js';
export { IntegrationAgent } from './integrationAgent.js';

// Agent factory for creating all agents
export function createAllAgents() {
  return {
    supervisor: new (require('./supervisorAgent.js').SupervisorAgent)(),
    modelRouter: new (require('./modelRouterAgent.js').ModelRouterAgent)(),
    toolsManager: new (require('./toolsManagerAgent.js').ToolsManagerAgent)(),
    functions: new (require('./functionsAgent.js').FunctionsAgent)(),
    memory: new (require('./memoryAgent.js').MemoryAgent)(),
    knowledge: new (require('./knowledgeAgent.js').KnowledgeAgent)(),
    workflowPlanner: new (require('./workflowPlannerAgent.js').WorkflowPlannerAgent)(),
    todoManager: new (require('./todoManagerAgent.js').TodoManagerAgent)(),
    chatSessionManager: new (require('./chatSessionManagerAgent.js').ChatSessionManagerAgent)(),
    observability: new (require('./observabilityAgent.js').ObservabilityAgent)(),
    personalization: new (require('./personalizationAgent.js').PersonalizationAgent)(),
    security: new (require('./securityAgent.js').SecurityAgent)(),
    integration: new (require('./integrationAgent.js').IntegrationAgent)(),
  };
}
