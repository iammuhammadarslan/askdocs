import type { TokenUsage } from "@askdocs/shared";

export function tokenUsage(
  promptTokens: number,
  completionTokens: number,
  totalTokens?: number,
): TokenUsage {
  return {
    promptTokens,
    completionTokens,
    totalTokens: totalTokens ?? promptTokens + completionTokens,
  };
}
