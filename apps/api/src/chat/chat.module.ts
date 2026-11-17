import { Module } from "@nestjs/common";
import { LlmModule } from "../llm/llm.module";
import { ChatController } from "./chat.controller";

@Module({
  imports: [LlmModule],
  controllers: [ChatController],
})
export class ChatModule {}
