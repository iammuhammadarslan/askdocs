import { Module } from "@nestjs/common";
import { readLLMConfig } from "./config";
import { createLLMProvider } from "./factory";
import { LLM_PROVIDER } from "./llm-provider";
import { NestLLMLogger } from "./nest-logger";

@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      useFactory: () => createLLMProvider(readLLMConfig(process.env), { logger: new NestLLMLogger() }),
    },
  ],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
