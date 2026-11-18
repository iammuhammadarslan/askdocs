import { BadRequestException, Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { chatRequestSchema, type ChatMessage, type Reply } from "@askdocs/shared";
import { ZodError } from "zod";
import { LLM_CONFIG, type LLMConfig } from "../llm/config";
import { LLM_PROVIDER, type LLMProvider } from "../llm/llm-provider";
import { TokenBudgetError } from "../llm/token-budget";
import { fitChatMessages } from "./fit-chat";

@Controller("chat")
export class ChatController {
  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: LLMProvider,
    @Inject(LLM_CONFIG) private readonly config: LLMConfig,
  ) {}

  @Post()
  @HttpCode(200)
  async chat(@Body() body: unknown): Promise<Reply> {
    const parsed = parseChatRequest(body);
    const maxOutput = parsed.options?.maxTokens ?? this.config.maxOutput;
    const messages = fitOrBadRequest(parsed.messages, {
      contextWindow: this.config.contextWindow,
      maxOutput,
    });
    return this.llm.chat(messages, { ...parsed.options, maxTokens: maxOutput });
  }
}

function fitOrBadRequest(
  messages: ChatMessage[],
  budget: { contextWindow: number; maxOutput: number },
): ChatMessage[] {
  try {
    return fitChatMessages(messages, budget);
  } catch (error) {
    if (error instanceof TokenBudgetError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}

function parseChatRequest(body: unknown) {
  try {
    return chatRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: "Invalid chat request",
        issues: error.issues,
      });
    }
    throw error;
  }
}
