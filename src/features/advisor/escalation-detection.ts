/**
 * Decides whether a manager's chat message goes to a person. Three layers, cheapest first:
 * A. they asked for a person, B. a strong rule, C. a small classifier for everything else.
 * Weak single words (race, legal, wage) never transfer alone; they only matter if the classifier is down.
 */
export type DetectionSource = "user_request" | "strong_rule" | "classifier" | "weak_rule";

export type EscalationDecision =
  | { action: "none" }
  | { action: "transfer" | "offer"; source: DetectionSource; reason: string; confidence?: ClassifierConfidence };

export type ClassifierConfidence = "high" | "medium" | "low";

export type ClassifierResult = {
  needsHuman: boolean;
  confidence: ClassifierConfidence;
  reason: string;
};

export const REQUESTED_ADVISOR_REASON = "The manager asked to talk to an HR advisor.";

/** The text sent by the "Talk to an advisor" and "Connect me" buttons. Must match the request patterns below. */
export const ADVISOR_REQUEST_TEXT = "Connect me to an HR advisor";

const WHO = "(?:an?\\s+|the\\s+|my\\s+|your\\s+)?(?:real\\s+|actual\\s+|live\\s+)?(?:hr\\s+)?(?:advisor|adviser|human|person|representative|rep)\\b";

const requestPatterns = [
  new RegExp(`\\b(?:talk|speak|chat)\\s+(?:to|with)\\s+${WHO}`, "i"),
  new RegExp(`\\b(?:connect|transfer|put)\\s+me\\s+(?:to|through\\s+to|with)\\s+${WHO}`, "i"),
  new RegExp(`\\b(?:want|need)\\s+${WHO}`, "i"),
];

/** "He should talk to an advisor" is about someone else, so it is left to the classifier. */
const aboutSomeoneElse = /\b(?:he|she|they|employee|manager|lead|someone|somebody)\s+(?:should|could|might|wants?|needs?)\b/i;

export function isAdvisorRequest(text: string): boolean {
  return requestPatterns.some((pattern) => pattern.test(text)) && !aboutSomeoneElse.test(text);
}

const strongRules: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\b(?:sexual(?:ly)?\s+)?harass(?:ment|ed|ing)\b|\bhostile\s+work/i,
    reason: "Potential harassment or hostile-work-environment concern.",
  },
  {
    pattern: /\bdiscriminat(?:ion|ed|ing)\b|\b(?:racist|sexist|ageist|ageism)\b|\bracial\s+slurs?\b/i,
    reason: "Potential discrimination concern.",
  },
  {
    pattern: /\bretaliat(?:ion|ed|ing|e)\b|\bwhistle-?blow|\breported\s+(?:a\s+)?safety\b|\b(?:filed|filing|file|lodged|made)\s+an?\s+(?:\w+\s+)?complaint\b/i,
    reason: "Potential retaliation or protected-activity concern.",
  },
  {
    pattern: /\b(?:fmla|medical\s+leave|maternity\s+leave|paternity\s+leave|pregnan(?:t|cy)|reasonable\s+accommodation|disability)\b/i,
    reason: "Potential protected leave, disability, or accommodation concern.",
  },
  {
    pattern: /\bfinal\s+warning\b|\bfire\s+(?:him|her|them)\b|\bwrongful(?:ly)?\s+terminat|\b(?:lay\s*off|laying\s+off|laid\s+off)\b/i,
    reason: "Potential termination or discipline risk.",
  },
  {
    pattern: /\b(?:violence|violent|weapons?|assault(?:ed)?)\b|\bthreatened\s+(?:to|me|him|her|them)\b/i,
    reason: "Potential workplace safety concern.",
  },
  {
    pattern: /\b(?:lawsuit|labor\s+board|wage\s+theft|pay\s+dispute|unpaid\s+(?:wages|overtime))\b|\b(?:sue|suing)\s+(?:us|me|the\s+company)\b|\b(?:hired|got|has|have)\s+(?:a|an)\s+(?:lawyer|attorney)\b/i,
    reason: "Potential wage, legal, or regulatory concern.",
  },
];

const weakRules: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(?:religion|race|gender)\b/i, reason: "Possible discrimination concern." },
  { pattern: /\bcomplaint\b/i, reason: "Possible complaint or protected activity." },
  { pattern: /\b(?:accommodation)\b|\bADA\b/, reason: "Possible leave or accommodation concern." },
  { pattern: /\b(?:terminate|termination|fired)\b/i, reason: "Possible termination concern." },
  { pattern: /\b(?:threats?|unsafe)\b/i, reason: "Possible workplace safety concern." },
  { pattern: /\b(?:wage|overtime|unpaid|legal|lawyer|attorney)\b/i, reason: "Possible wage or legal concern." },
];

export function matchStrongRule(text: string): string | null {
  return strongRules.find((rule) => rule.pattern.test(text))?.reason ?? null;
}

export function matchWeakRule(text: string): string | null {
  return weakRules.find((rule) => rule.pattern.test(text))?.reason ?? null;
}

/** Layers A and B. Returns null when the classifier has to decide. */
export function decideFromRules(text: string): EscalationDecision | null {
  if (isAdvisorRequest(text)) return { action: "transfer", source: "user_request", reason: REQUESTED_ADVISOR_REASON };
  const strong = matchStrongRule(text);
  return strong ? { action: "transfer", source: "strong_rule", reason: strong } : null;
}

/**
 * Layer C. A failed classifier (null) falls back to the weak rules as an offer,
 * so a possible high-risk matter is never silently ignored.
 */
export function decideFromClassifier(text: string, result: ClassifierResult | null): EscalationDecision {
  if (!result) {
    const weak = matchWeakRule(text);
    return weak ? { action: "offer", source: "weak_rule", reason: weak } : { action: "none" };
  }
  if (!result.needsHuman || result.confidence === "low") return { action: "none" };
  return {
    action: result.confidence === "high" ? "transfer" : "offer",
    source: "classifier",
    reason: result.reason,
    confidence: result.confidence,
  };
}
