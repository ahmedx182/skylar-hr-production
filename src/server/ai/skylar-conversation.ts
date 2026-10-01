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
  callerRole?: "admin" | "employee";
}

interface CachedResponse {
  text: string;
  expiresAt: number;
}

const responseCache = new Map<string, CachedResponse>();

const ADMIN_SYSTEM_PROMPT =
  "You are Skylar, a senior HR advisor with the candor and strategic depth of a CHRO. You are speaking with a manager or executive. Give direct, evidence-based guidance on people decisions, performance, risk, and policy. You may reference internal employee context, patterns, and management options that have been provided to you. Be frank about hard calls. Do not hedge unnecessarily. Keep responses concise and actionable. Do not give legal advice, but flag when legal review is warranted. Never mention being an AI.";

const EMPLOYEE_SYSTEM_PROMPT =
  "You are Skylar, a warm and experienced HR professional. You are speaking directly with an employee. Your job is to listen, support, and give clear, honest guidance from the employee's perspective. Help them understand their rights, navigate workplace situations, and feel heard. Never share internal management notes, performance records, escalation details, or anything that was written about them by a manager. Keep your tone human, calm, and non-judgmental. Do not give legal advice. Never mention being an AI.";

function getSystemPrompt(callerRole?: "admin" | "employee"): string {
  return callerRole === "employee" ? EMPLOYEE_SYSTEM_PROMPT : ADMIN_SYSTEM_PROMPT;
}

function buildUserPrompt(input: SkylarConversationInput): string {
  const isEmployee = input.callerRole === "employee";

  const history = input.history?.length
    ? input.history
        .map((message) => {
          const speaker = message.role === "assistant" ? "Skylar" : isEmployee ? "Employee" : "Manager";
          return `${speaker}: ${message.text}`;
        })
        .join("\n")
    : "No saved conversation history yet.";

  if (isEmployee) {
    return [
      `Employee name: ${input.employeeName || "Not provided"}`,
      `Recent conversation history:\n${history}`,
      `Employee message: ${input.prompt}`,
    ].join("\n\n");
  }

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
    [new SystemMessage(getSystemPrompt(input.callerRole)), new HumanMessage(buildUserPrompt(input))],
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
