export type ConversationLedgerSummary = {
  title: string;
  asked: string | null;
  goal: string | null;
  prepItems: string[];
  outlineItems: string[];
  nextSteps: string[];
};

export function cleanLedgerMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s*/g, "")
    .replace(/^[-*]\s+/g, "")
    .trim();
}

function sectionAfterHeading(text: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(
    new RegExp(
      `(?:^|\\n)(?:Skylar:\\s*)?#{1,6}\\s*${escaped}:?\\s*\\n([\\s\\S]*?)(?=\\n(?:Skylar:\\s*)?#{1,6}\\s|\\n---|$)`,
      "i",
    ),
  );
  return match?.[1]?.trim() || null;
}

function transcriptTitle(description: string): string {
  const firstLine = description.split(/\n/).find((line) => line.trim()) ?? "Conversation transcript";
  return cleanLedgerMarkdown(firstLine.replace(/^Conversation transcript\s*-\s*/i, ""));
}

function managerPrompt(description: string): string | null {
  const match = description.match(/(?:^|\n)Manager:\s*([\s\S]*?)(?=\n\s*Skylar:|\n\s*Manager:|$)/i);
  return match?.[1] ? cleanLedgerMarkdown(match[1]) : null;
}

function goalText(description: string): string | null {
  const match = description.match(/\*\*Your goal:\*\*\s*([^\n]+)/i);
  return match?.[1] ? cleanLedgerMarkdown(match[1]) : null;
}

function sectionItems(section: string | null): string[] {
  if (!section) return [];
  return section
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\.\s*/, ""))
    .map(cleanLedgerMarkdown)
    .filter(Boolean)
    .slice(0, 3);
}

export function conversationLedgerSummary(description: string): ConversationLedgerSummary {
  const beforeTalk = sectionAfterHeading(description, "Before you talk");
  const outline = sectionAfterHeading(description, "Conversation outline");
  const afterConversation = sectionAfterHeading(description, "After the conversation");

  return {
    title: transcriptTitle(description),
    asked: managerPrompt(description),
    goal: goalText(description),
    prepItems: sectionItems(beforeTalk),
    outlineItems: sectionItems(outline).slice(0, 5),
    nextSteps: sectionItems(afterConversation),
  };
}
