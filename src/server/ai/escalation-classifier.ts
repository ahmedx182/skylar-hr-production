import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ClassifierResult } from "@/features/advisor/escalation-detection";
import type { SkylarConversationMessage } from "@/features/briefing/skylar-conversation-transcript";
import { getServerEnv } from "@/lib/env/server";

/** It runs before every manager reply, so it must not hold the chat up. */
const CLASSIFIER_TIMEOUT_MS = 5000;
const RECENT_TURNS = 6;
const MAX_REASON_LENGTH = 300;

const SYSTEM_PROMPT = `You triage messages a manager sends to an HR assistant. Decide whether a human HR advisor needs to take over, rather than the assistant answering.

A human is needed for: harassment or a hostile workplace, discrimination, retaliation or whistleblowing, disability, medical leave or accommodation, termination or final warnings, violence or workplace safety, and wage, legal or regulatory disputes. This includes the same situations described in other words, without the usual terms.

A human is not needed for everyday management: feedback, performance conversations, scheduling, coaching, policy questions asked in general, or a word like "race" or "legal" used in an unrelated sense.

Confidence: "high" when the message clearly describes such a situation, "medium" when it might, "low" when it probably doesn't. The reason is one short sentence for the advisor, in plain words.`;

const outputSchema = {
  type: "object",
  properties: {
    needs_human: { type: "boolean" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    reason: { type: "string" },
  },
  required: ["needs_human", "confidence", "reason"],
  additionalProperties: false,
} as const;

const parsedOutput = z.object({
  needs_human: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  // Trimmed rather than rejected: a wordy reason must not throw away the decision.
  reason: z.string().trim().min(1).transform((reason) => reason.slice(0, MAX_REASON_LENGTH)),
});

/** Returns null on any failure (no key, timeout, refusal, bad output). The caller falls back to the rules. */
export async function classifyEscalation(prompt: string, history: SkylarConversationMessage[] = []): Promise<ClassifierResult | null> {
  try {
    const env = getServerEnv();
    if (!env.ANTHROPIC_API_KEY) return null;

    const recent = history
      .slice(-RECENT_TURNS)
      .map((message) => `${message.role === "assistant" ? "Assistant" : "Manager"}: ${message.text}`)
      .join("\n\n");
    const content = `${recent ? `Earlier in this conversation:\n\n${recent}\n\n` : ""}Latest message from the manager:\n\n${prompt}`;

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: CLASSIFIER_TIMEOUT_MS, maxRetries: 0 });
    const response = await client.messages.create({
      model: env.ANTHROPIC_CLASSIFIER_MODEL,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: outputSchema } },
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason !== "end_turn") return null;

    const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    const parsed = parsedOutput.safeParse(JSON.parse(text));
    if (!parsed.success) return null;
    return { needsHuman: parsed.data.needs_human, confidence: parsed.data.confidence, reason: parsed.data.reason };
  } catch (error) {
    console.error("Escalation classifier failed; falling back to the rules", error);
    return null;
  }
}
