import { Logger } from "@nestjs/common";
import type { LLMLogger } from "./logger";

export class NestLLMLogger implements LLMLogger {
  private readonly logger = new Logger("LLM");

  info(event: string, meta?: Record<string, unknown>): void {
    this.logger.log(`${event} ${JSON.stringify(meta ?? {})}`);
  }

  warn(event: string, meta?: Record<string, unknown>): void {
    this.logger.warn(`${event} ${JSON.stringify(meta ?? {})}`);
  }
}
