import type { ModelMessage } from "ai";

/**
 * Manage conversation history with size limits
 */
export class History {
  private messages: ModelMessage[] = [];
  private maxMessages: number;

  constructor(maxMessages: number = 100) {
    this.maxMessages = maxMessages;
  }

  add(message: ModelMessage): void {
    this.messages.push(message);
    this.trim();
  }

  addMany(messages: ModelMessage[]): void {
    this.messages.push(...messages);
    this.trim();
  }

  getAll(): ModelMessage[] {
    return [...this.messages];
  }

  getLast(n: number): ModelMessage[] {
    return this.messages.slice(-n);
  }

  clear(): void {
    this.messages = [];
  }

  get length(): number {
    return this.messages.length;
  }

  private trim(): void {
    if (this.messages.length > this.maxMessages) {
      // Keep system messages and trim from the beginning
      const systemMessages = this.messages.filter(
        (m) => m.role === "system"
      );
      const nonSystemMessages = this.messages.filter(
        (m) => m.role !== "system"
      );
      let trimmed = nonSystemMessages.slice(
        nonSystemMessages.length - this.maxMessages + systemMessages.length
      );
      // Ensure the history always starts with a user message so that
      // models with strict turn-ordering Jinja templates (e.g. LM Studio)
      // don't fail with "No user query found in messages".
      const firstUserIdx = trimmed.findIndex((m) => m.role === "user");
      if (firstUserIdx > 0) {
        trimmed = trimmed.slice(firstUserIdx);
      }
      this.messages = [...systemMessages, ...trimmed];
    }
  }

  toJSON(): ModelMessage[] {
    return this.getAll();
  }

  static fromJSON(messages: ModelMessage[], maxMessages?: number): History {
    const history = new History(maxMessages);
    history.messages = messages;
    return history;
  }
}
