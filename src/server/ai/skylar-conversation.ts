import "server-only";
import { createHash } from "node:crypto";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage, type AIMessageChunk } from "@langchain/core/messages";
import type { SkylarConversationMessage } from "@/features/briefing/skylar-conversation-transcript";
import { ExternalServiceError } from "@/lib/errors";
import { humanizeText } from "@/lib/humanize-text";
import type { ServerEnv } from "@/lib/env/server";

export interface SkylarConversationInput {
  prompt: string;
  employeeId?: string;
  employeeName?: string;
  cardTitle?: string;
  cardBody?: string;
  history?: SkylarConversationMessage[];
  callerRole?: "admin" | "employee";
  /** What the server did about a high-risk message (admin chat only); see chat-escalation. */
  escalationNotice?: string;
}

interface CachedResponse {
  text: string;
  expiresAt: number;
}

const responseCache = new Map<string, CachedResponse>();

const ADMIN_SYSTEM_PROMPT =
  "You are Skylar, a senior HR advisor with the candor and strategic depth of a CHRO. You are speaking with a manager or executive. Give direct, evidence-based guidance on people decisions, performance, risk, and policy. You may reference internal employee context, patterns, and management options that have been provided to you. Be frank about hard calls. Do not hedge unnecessarily. Keep responses concise and actionable. Do not give legal advice, but flag when legal review is warranted. Never mention being an AI. ESCALATION RULES: Some matters are high alert and you must not advise on how to handle them: harassment or a hostile workplace, discrimination, retaliation or whistleblowing, disability, medical leave or accommodation, termination or final warnings, violence or workplace safety, and wage, legal or regulatory disputes. For these, do not give guidance on the substance. Say plainly that this is a high alert you cannot advise on, state what happened to it using only the SYSTEM NOTICE in the message, and, in a couple of natural sentences rather than a list, say what is safe to do while the advisor reviews: hold off on acting or confronting anyone, write down facts and dates without opinions, and keep it confidential. Never say a matter was escalated unless the SYSTEM NOTICE says it was. Never promise an outcome. Keep this reply short.";

const EMPLOYEE_SYSTEM_PROMPT =
  "You are Skylar, a warm and experienced HR professional. You are speaking directly with an employee. Your job is to listen, support, and give clear, honest guidance from the employee's perspective. Help them understand their rights, navigate workplace situations, and feel heard. Never share internal management notes, performance records, escalation details, or anything that was written about them by a manager. Keep your tone human, calm, and non-judgmental. Do not give legal advice. Never mention being an AI.";

const STYLE_RULES =
  "HOW TO WRITE: Sound like a thoughtful, experienced person talking to a colleague, not like a report or a template. Write in plain, natural sentences and short paragraphs. Never use bullet points, numbered lists, headings, bold, italics, tables or emojis. Never use em dashes, en dashes or double hyphens; use a comma, a full stop or the word and instead. Do not announce structure such as 'here are three steps'; weave any advice into the sentences themselves. Be warm and direct, vary your sentence length, speak straight to the person, and keep it brief.";

function getSystemPrompt(callerRole?: "admin" | "employee"): string {
  const base = callerRole === "employee" ? EMPLOYEE_SYSTEM_PROMPT : ADMIN_SYSTEM_PROMPT;
  return `${base} ${STYLE_RULES}`;
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
    ...(input.escalationNotice ? [input.escalationNotice] : []),
  ].join("\n\n");
}

function getCacheKey(input: SkylarConversationInput): string {
  // The system prompt is part of the key so a prompt change never serves old-style cached replies.
  return createHash("sha256")
    .update(JSON.stringify({ input, system: getSystemPrompt(input.callerRole) }))
    .digest("hex");
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
      const text = humanizeText(getChunkText(chunk));
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
