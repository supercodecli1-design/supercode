// ═══════════════════════════════════════════════════════════════════════════════
// SUPERCODE - Event Bus for Agent Communication
// ═══════════════════════════════════════════════════════════════════════════════

import EventEmitter from 'eventemitter3';
import type { SuperCodeEvent, AgentMessage, LogLevel } from '../types/index.js';

type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

class EventBus extends EventEmitter {
  private static instance: EventBus;
  private eventHistory: SuperCodeEvent[] = [];
  private maxHistorySize = 1000;

  private constructor() {
    super();
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  // Emit a typed SuperCode event
  emitEvent(event: SuperCodeEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    this.emit(event.type, event);
    this.emit('*', event); // Wildcard for all events
  }

  // Subscribe to a specific event type
  onEvent<T extends SuperCodeEvent['type']>(
    type: T,
    handler: EventHandler<Extract<SuperCodeEvent, { type: T }>>
  ): void {
    this.on(type, handler as EventHandler);
  }

  // Subscribe to all events
  onAllEvents(handler: EventHandler<SuperCodeEvent>): void {
    this.on('*', handler);
  }

  // Send a message between agents
  sendMessage(message: AgentMessage): void {
    this.emit(`message:${message.to}`, message);
    this.emit('message:*', message);
  }

  // Subscribe to messages for a specific agent
  onMessage(agentId: string, handler: EventHandler<AgentMessage>): void {
    this.on(`message:${agentId}`, handler);
  }

  // Get event history
  getHistory(limit?: number): SuperCodeEvent[] {
    const history = [...this.eventHistory];
    return limit ? history.slice(-limit) : history;
  }

  // Clear event history
  clearHistory(): void {
    this.eventHistory = [];
  }

  // Emit notification
  notify(title: string, message: string, level: LogLevel = 'info'): void {
    this.emitEvent({ type: 'notification', title, message, level });
  }
}

export const eventBus = EventBus.getInstance();
export default eventBus;
