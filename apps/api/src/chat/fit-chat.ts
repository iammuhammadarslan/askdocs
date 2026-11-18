import type { ChatMessage } from "@askdocs/shared";
import { fitToBudget, TokenBudgetError } from "../llm/token-budget";

/**
 * Split a chat transcript into system text and history, then drop the oldest
 * history until it fits. Documents default to empty until retrieval exists.
 */
export function fitChatMessages(
  messages: readonly ChatMessage[],
  budget: { contextWindow: number; maxOutput: number; docs?: string },
): ChatMessage[] {
  const systemParts: string[] = [];
  const history: ChatMessage[] = [];
  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push(message.content);
    } else {
      history.push(message);
    }
  }

  const fitted = fitToBudget({
    system: systemParts.join("\n\n"),
    history,
    docs: budget.docs ?? "",
    maxOutput: budget.maxOutput,
    contextWindow: budget.contextWindow,
  });

  if (history.length > 0 && fitted.history.length === 0) {
    throw new TokenBudgetError(
      "The latest message does not fit in the context window after reserving room for the reply. Shorten it or raise LLM_CONTEXT_WINDOW.",
    );
  }

  const next: ChatMessage[] = [];
  if (fitted.system.length > 0) {
    next.push({ role: "system", content: fitted.system });
  }
  next.push(...fitted.history);
  return next;
}
