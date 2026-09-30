export type LedgerRiskClassification = {
  isHighRisk: boolean;
  reason: string | null;
};

const riskSignals = [
  {
    pattern: /\b(harass(?:ment|ed|ing)?|sexual harassment|hostile work)\b/i,
    reason: "Potential harassment or hostile-work-environment concern.",
  },
  {
    pattern: /\b(discriminat(?:ion|ed|ing)?|racist|sexist|ageism|religion|race|gender)\b/i,
    reason: "Potential discrimination concern.",
  },
  {
    pattern: /\b(retaliat(?:ion|ed|ing)?|whistleblower|reported safety|complaint)\b/i,
    reason: "Potential retaliation or protected-activity concern.",
  },
  {
    pattern: /\b(disability|medical leave|fmla|ada|pregnan(?:t|cy)|accommodation)\b/i,
    reason: "Potential protected leave, disability, or accommodation concern.",
  },
  {
    pattern: /\b(terminate|termination|fired|fire him|fire her|layoff|lay off|final warning)\b/i,
    reason: "Potential termination or discipline risk.",
  },
  {
    pattern: /\b(violence|threat(?:en|ened|s)?|unsafe|weapon|assault)\b/i,
    reason: "Potential workplace safety concern.",
  },
  {
    pattern: /\b(wage|overtime|pay dispute|unpaid|labor board|lawsuit|legal|lawyer|attorney)\b/i,
    reason: "Potential wage, legal, or regulatory concern.",
  },
];

export function classifyLedgerRisk(text: string): LedgerRiskClassification {
  const normalized = text.trim();
  if (!normalized) return { isHighRisk: false, reason: null };

  const signal = riskSignals.find((item) => item.pattern.test(normalized));
  if (!signal) return { isHighRisk: false, reason: null };

  return { isHighRisk: true, reason: signal.reason };
}
