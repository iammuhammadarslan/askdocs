import { type ArgumentsHost, Catch, type ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";
import { LLMError } from "./errors";

@Catch(LLMError)
export class LlmExceptionFilter implements ExceptionFilter {
  catch(exception: LLMError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = publicStatus(exception.status);
    response.status(status).json({
      statusCode: status,
      message: exception.message,
      provider: exception.provider,
      retryable: exception.retryable,
    });
  }
}

function publicStatus(status: number | undefined): number {
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 429) {
    return status;
  }
  return 502;
}
