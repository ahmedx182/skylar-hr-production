import { describe, expect, it } from "vitest";
import {
  ADVISOR_REQUEST_TEXT,
  decideFromClassifier,
  decideFromRules,
  isAdvisorRequest,
  matchStrongRule,
  matchWeakRule,
} from "@/features/advisor/escalation-detection";

describe("asking for a person", () => {
  it.each([
    ADVISOR_REQUEST_TEXT,
    "I want to talk to a human",
    "can I speak with an HR advisor please",
    "I need a real person",
    "transfer me to a representative",
  ])("recognises %s", (text) => expect(isAdvisorRequest(text)).toBe(true));

  it.each([
    "He should talk to an advisor about his pension",
    "How do I talk to my team about the reorg?",
    "She wants to speak with a person in payroll",
  ])("doesn't treat %s as a request", (text) => expect(isAdvisorRequest(text)).toBe(false));
});

describe("strong and weak rules", () => {
  it.each([
    "She says her lead is harassing her",
    "He filed a formal complaint yesterday",
    "I want to give a final warning",
    "Can I fire him tomorrow?",
    "She's pregnant and asked about her schedule",
    "He threatened to hit a coworker",
    "They hired a lawyer over unpaid overtime",
  ])("transfers on: %s", (text) => expect(decideFromRules(text)).toMatchObject({ action: "transfer", source: "strong_rule" }));

  it.each([
    "We're in a race to finish the launch",
    "What are the legal holidays this year?",
    "Is overtime approved for this sprint?",
    "Ada has been doing great work",
    "He got fired up in the meeting",
  ])("leaves a stray word to the classifier: %s", (text) => expect(matchStrongRule(text)).toBeNull());

  it("no longer reads the name Ada as the ADA", () => {
    expect(matchWeakRule("Ada has been doing great work")).toBeNull();
    expect(matchWeakRule("She asked about ADA rights")).not.toBeNull();
  });
});

describe("classifier decisions", () => {
  const text = "He keeps commenting on her accent";

  it("transfers on high, offers on medium, ignores low or no need", () => {
    expect(decideFromClassifier(text, { needsHuman: true, confidence: "high", reason: "r" })).toMatchObject({ action: "transfer", source: "classifier" });
    expect(decideFromClassifier(text, { needsHuman: true, confidence: "medium", reason: "r" })).toMatchObject({ action: "offer" });
    expect(decideFromClassifier(text, { needsHuman: true, confidence: "low", reason: "r" })).toEqual({ action: "none" });
    expect(decideFromClassifier(text, { needsHuman: false, confidence: "high", reason: "r" })).toEqual({ action: "none" });
  });

  it("falls back to the weak rules as an offer when the classifier fails", () => {
    expect(decideFromClassifier("Is this a legal issue?", null)).toMatchObject({ action: "offer", source: "weak_rule" });
    expect(decideFromClassifier("How do I run a good one-to-one?", null)).toEqual({ action: "none" });
  });
});
