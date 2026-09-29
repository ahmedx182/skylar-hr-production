export type SkylarConversationMessage = {
  role: "user" | "assistant";
  text: string;
  createdAtMs: number;
};

export type SkylarConversationContext = {
  employeeId?: string;
  employeeName?: string;
  cardTitle?: string;
  cardBody?: string;
};

export function skylarConversationThreadKey(context: SkylarConversationContext): string {
  if (context.employeeId?.trim()) return `employee:${context.employeeId.trim()}`;
  if (context.employeeName?.trim()) return `employee-name:${context.employeeName.trim().toLowerCase()}`;
  return "workspace:general";
}

export function buildSkylarConversationTranscript(messages: SkylarConversationMessage[]): string {
  return messages
    .filter((message) => message.text.trim())
    .map((message) => {
      const speaker = message.role === "assistant" ? "Skylar" : "Manager";
      return `${speaker}: ${message.text.trim()}`;
    })
    .join("\n\n");
}
