import { Module } from "@nestjs/common";
import { LLM_CONFIG, readLLMConfig, type LLMConfig } from "./config";
import { createLLMProvider } from "./factory";
import { LLM_PROVIDER } from "./llm-provider";
import { NestLLMLogger } from "./nest-logger";

@Module({
  providers: [
    {
      provide: LLM_CONFIG,
      useFactory: (): LLMConfig => readLLMConfig(process.env),
    },
    {
      provide: LLM_PROVIDER,
      inject: [LLM_CONFIG],
      useFactory: (config: LLMConfig) => createLLMProvider(config, { logger: new NestLLMLogger() }),
    },
  ],
  exports: [LLM_PROVIDER, LLM_CONFIG],
})
export class LlmModule {}
