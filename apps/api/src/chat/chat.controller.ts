import { BadRequestException, Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { chatRequestSchema, type Reply } from "@askdocs/shared";
import { ZodError } from "zod";
import { LLM_PROVIDER, type LLMProvider } from "../llm/llm-provider";

@Controller("chat")
export class ChatController {
  constructor(@Inject(LLM_PROVIDER) private readonly llm: LLMProvider) {}

  @Post()
  @HttpCode(200)
  async chat(@Body() body: unknown): Promise<Reply> {
    const parsed = parseChatRequest(body);
    return this.llm.chat(parsed.messages, parsed.options);
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
