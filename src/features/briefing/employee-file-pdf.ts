import type { jsPDF } from "jspdf";

export type PdfEmployee = {
  employeeCode: string | null;
  name: string;
  email: string | null;
  jobTitle: string | null;
  location: string | null;
  summary: string | null;
  updatedAtMs: number;
};

export type PdfLedger = {
  type: string;
  description: string;
  statusDot: "amber" | "green" | "red" | null;
  dateMs: number;
};

export function fileSafeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "employee";
}

function dateLabel(value: number): string {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: PdfLedger["statusDot"]): string {
  if (status === "red") return "High attention";
  if (status === "amber") return "Follow-up";
  if (status === "green") return "Resolved";
  return "Filed";
}

const CP1252_EXTRAS = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const REPLACEMENTS: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "⇒": "=>",
  "≥": ">=",
  "≤": "<=",
  "≠": "!=",
  "✓": "-",
  "✔": "-",
  "✗": "x",
  "✘": "x",
  "▪": "•",
  "◦": "•",
  "‑": "-",
  " ": " ",
};

/** The built-in PDF fonts only cover Windows-1252; anything else prints as garbage. */
function pdfSafe(text: string): string {
  return Array.from(text)
    .map((char) => {
      if (REPLACEMENTS[char] !== undefined) return REPLACEMENTS[char];
      const code = char.codePointAt(0) ?? 0;
      if (code === 9 || code === 10 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255)) return char;
      return CP1252_EXTRAS.has(char) ? char : "";
    })
    .join("");
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|\s)\*([^*\s][^*]*)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

type Block =
  | { kind: "speaker"; speaker: string; text: string }
  | { kind: "heading"; text: string }
  | { kind: "bullet"; marker: string; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "gap" };

function parseRecord(description: string): Block[] {
  const blocks: Block[] = [];
  for (const rawLine of pdfSafe(description).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^-{3,}$/.test(line)) {
      if (blocks.length && blocks[blocks.length - 1].kind !== "gap") blocks.push({ kind: "gap" });
      continue;
    }

    const speaker = line.match(/^(Manager|Skylar|Employee|Advisor):\s*(.*)$/i);
    if (speaker) {
      const rest = speaker[2];
      const heading = rest.match(/^#{1,6}\s+(.*)$/);
      blocks.push({ kind: "speaker", speaker: speaker[1], text: heading ? "" : stripInlineMarkdown(rest) });
      if (heading) blocks.push({ kind: "heading", text: stripInlineMarkdown(heading[1]) });
      continue;
    }

    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: "heading", text: stripInlineMarkdown(heading[1]) });
      continue;
    }

    const bullet = line.match(/^([-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      blocks.push({
        kind: "bullet",
        marker: /^\d/.test(bullet[1]) ? bullet[1].replace(")", ".") : "•",
        text: stripInlineMarkdown(bullet[2]),
      });
      continue;
    }

    blocks.push({ kind: "paragraph", text: stripInlineMarkdown(line) });
  }
  while (blocks.length && blocks[blocks.length - 1].kind === "gap") blocks.pop();
  return blocks;
}

export function buildEmployeeFilePdf(JsPDF: typeof jsPDF, employee: PdfEmployee, ledger: PdfLedger[]) {
  const doc = new JsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const footerY = pageHeight - 28;
  const bottomLimit = footerY - 20;
  const name = pdfSafe(employee.name);
  const generatedAt = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  type Style = { size: number; bold?: boolean; color?: [number, number, number] };
  const INK: [number, number, number] = [17, 17, 17];
  const MUTED: [number, number, number] = [96, 93, 87];

  function applyStyle({ size, bold, color = INK }: Style) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
  }

  function ensureSpace(y: number, needed: number) {
    if (y + needed <= bottomLimit) return y;
    doc.addPage();
    return margin + 8;
  }

  /** Writes wrapped text one line at a time so long records continue onto the next page instead of being cut off. */
  function writeText(text: string, y: number, style: Style, { x = margin, width = contentWidth, lineHeight = style.size * 1.45 } = {}) {
    applyStyle(style);
    const lines = doc.splitTextToSize(pdfSafe(text), width) as string[];
    let cursor = y;
    for (const line of lines) {
      const next = ensureSpace(cursor, lineHeight);
      if (next !== cursor) applyStyle(style);
      cursor = next;
      doc.text(line, x, cursor);
      cursor += lineHeight;
    }
    return cursor;
  }

  // Header band, sized to however many lines the name wraps to.
  applyStyle({ size: 22, bold: true });
  const nameLines = (doc.splitTextToSize(name, contentWidth) as string[]).slice(0, 2);
  const bandHeight = 92 + nameLines.length * 26;
  doc.setFillColor(17, 17, 20);
  doc.rect(0, 0, pageWidth, bandHeight, "F");
  applyStyle({ size: 22, bold: true, color: [244, 239, 231] });
  doc.text(nameLines, margin, 58, { lineHeightFactor: 1.2 });
  applyStyle({ size: 10, color: [190, 186, 177] });
  const subtitleY = 58 + nameLines.length * 26;
  doc.text(pdfSafe([employee.jobTitle, employee.employeeCode].filter(Boolean).join("  |  ") || "Employee file"), margin, subtitleY);
  doc.text(`Skylar employee file  |  Exported ${generatedAt}`, margin, subtitleY + 16);

  let y = bandHeight + 36;
  y = writeText("PROFILE", y, { size: 10, bold: true, color: MUTED });
  y += 4;

  const profileRows: [string, string][] = [
    ["Email", employee.email ?? "Not set"],
    ["Location", employee.location ?? "Not set"],
    ["Last updated", dateLabel(employee.updatedAtMs)],
  ];
  const labelWidth = 96;
  for (const [label, value] of profileRows) {
    y = ensureSpace(y, 16);
    applyStyle({ size: 10, bold: true, color: MUTED });
    doc.text(label, margin, y);
    y = writeText(value, y, { size: 10 }, { x: margin + labelWidth, width: contentWidth - labelWidth, lineHeight: 15 });
    y += 3;
  }

  if (employee.summary) {
    y += 12;
    y = writeText("SUMMARY", ensureSpace(y, 40), { size: 10, bold: true, color: MUTED });
    y += 2;
    y = writeText(stripInlineMarkdown(employee.summary), y, { size: 10.5 });
  }

  y += 22;
  y = writeText(`HISTORY  (${ledger.length})`, ensureSpace(y, 60), { size: 10, bold: true, color: MUTED });
  y += 6;

  if (ledger.length === 0) {
    y = writeText("No saved notes or conversations yet.", y, { size: 10, color: MUTED });
  }

  ledger.forEach((entry, index) => {
    y = ensureSpace(y, 64);
    if (index > 0) {
      doc.setDrawColor(222, 218, 209);
      doc.line(margin, y - 8, pageWidth - margin, y - 8);
      y += 8;
    }

    y = writeText(
      `${dateLabel(entry.dateMs)}   |   ${entry.type.replace(/_/g, " ").toUpperCase()}   |   ${statusLabel(entry.statusDot)}`,
      y,
      { size: 8.5, bold: true, color: MUTED },
    );
    y += 4;

    for (const block of parseRecord(entry.description)) {
      if (block.kind === "gap") {
        y += 5;
      } else if (block.kind === "speaker") {
        y = writeText(`${block.speaker}:`, ensureSpace(y + 3, 30), { size: 9.5, bold: true });
        if (block.text) y = writeText(block.text, y, { size: 10 });
      } else if (block.kind === "heading") {
        y = writeText(block.text, ensureSpace(y + 4, 30), { size: 10.5, bold: true });
      } else if (block.kind === "bullet") {
        y = ensureSpace(y, 15);
        applyStyle({ size: 10 });
        doc.text(block.marker, margin + 6, y);
        y = writeText(block.text, y, { size: 10 }, { x: margin + 22, width: contentWidth - 22 });
      } else {
        y = writeText(block.text, y, { size: 10 });
      }
    }
    y += 16;
  });

  const pageCount = doc.getNumberOfPages();
  applyStyle({ size: 8.5 });
  const footerLines = doc.splitTextToSize(`Skylar employee file  |  ${name}`, contentWidth - 100) as string[];
  const footerName = footerLines.length > 1 ? `${footerLines[0].trimEnd()}...` : footerLines[0];
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    applyStyle({ size: 8.5, color: [128, 124, 116] });
    doc.text(footerName, margin, footerY);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, footerY, { align: "right" });
  }

  return doc;
}
