/** Replaces em dashes, en dashes and double hyphens with a comma so replies read like a person wrote them. */
export function humanizeText(text: string): string {
  return text.replace(/\s*(?:—|–|--)\s*/g, ", ");
}
