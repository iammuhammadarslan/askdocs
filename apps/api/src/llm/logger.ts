export interface LLMLogger {
  info(event: string, meta?: Record<string, unknown>): void;
  warn(event: string, meta?: Record<string, unknown>): void;
}

export class ConsoleLLMLogger implements LLMLogger {
  info(event: string, meta?: Record<string, unknown>): void {
    console.info(JSON.stringify({ level: "info", event, ...meta }));
  }

  warn(event: string, meta?: Record<string, unknown>): void {
    console.warn(JSON.stringify({ level: "warn", event, ...meta }));
  }
}
