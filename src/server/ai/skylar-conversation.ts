import "server-only";
import { createHash } from "node:crypto";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage, type AIMessageChunk } from "@langchain/core/messages";
import type { SkylarConversationMessage } from "@/features/briefing/skylar-conversation-transcript";
import { ExternalServiceError } from "@/lib/errors";
import type { ServerEnv } from "@/lib/env/server";

export interface SkylarConversationInput {
  prompt: string;
  employeeId?: string;
  employeeName?: string;
  cardTitle?: string;
  cardBody?: string;
  history?: SkylarConversationMessage[];
}

interface CachedResponse {
  text: string;
  expiresAt: number;
}

const responseCache = new Map<string, CachedResponse>();

const systemPrompt =
  "You are Skylar, a calm HR briefing assistant. Help a people manager prepare for a fair, human conversation. Keep responses practical and concise. Do not give legal advice, diagnose people, or recommend punitive action. Ask one useful follow-up question when context is missing. Use plain language and never mention being an AI.";

function buildUserPrompt(input: SkylarConversationInput): string {
  const history = input.history?.length
    ? input.history
        .map((message) => `${message.role === "assistant" ? "Skylar" : "Manager"}: ${message.text}`)
        .join("\n")
    : "No saved conversation history yet.";

  return [
    `Employee: ${input.employeeName || "Not specified"}`,
    `Briefing focus: ${input.cardTitle || "Not specified"}`,
    `Existing context: ${input.cardBody || "Not specified"}`,
    `Recent saved conversation context:\n${history}`,
    `Manager request: ${input.prompt}`,
  ].join("\n\n");
}

function getCacheKey(input: SkylarConversationInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function getChunkText(chunk: AIMessageChunk): string {
  if (typeof chunk.content === "string") return chunk.content;

  return chunk.content
    .map((block) => {
      if (typeof block === "string") return block;
      if ("text" in block && typeof block.text === "string") return block.text;
      return "";
    })
    .join("");
}

function pruneExpiredCache(now: number): void {
  for (const [key, value] of Array.from(responseCache.entries())) {
    if (value.expiresAt <= now) responseCache.delete(key);
  }
}

async function* streamCachedText(text: string): AsyncIterable<string> {
  yield text;
}

export async function streamSkylarConversation(
  env: ServerEnv,
  input: SkylarConversationInput,
): Promise<AsyncIterable<string>> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ExternalServiceError("Skylar is not connected yet. Add ANTHROPIC_API_KEY to enable conversation help.");
  }

  const cacheKey = getCacheKey(input);
  const now = Date.now();
  pruneExpiredCache(now);

  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return streamCachedText(cached.text);
  }

  const model = new ChatAnthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.ANTHROPIC_MODEL,
    maxTokens: env.AI_MAX_OUTPUT_TOKENS,
    temperature: 0.2,
    streaming: true,
  });

  const stream = await model.stream(
    [new SystemMessage(systemPrompt), new HumanMessage(buildUserPrompt(input))],
    {
      cache_control: {
        type: "ephemeral",
        ttl: env.ANTHROPIC_PROMPT_CACHE_TTL,
      },
      streamUsage: true,
    },
  );

  async function* cacheAndStream(): AsyncIterable<string> {
    let fullText = "";

    for await (const chunk of stream) {
      const text = getChunkText(chunk);
      if (!text) continue;
      fullText += text;
      yield text;
    }

    if (fullText) {
      responseCache.set(cacheKey, {
        text: fullText,
        expiresAt: Date.now() + env.AI_RESPONSE_CACHE_TTL_MS,
      });
    }
  }

  return cacheAndStream();
}

export function clearSkylarConversationCacheForTests(): void {
  responseCache.clear();
}
