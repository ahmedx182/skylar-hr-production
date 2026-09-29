"use client";

import { Download } from "lucide-react";

type PdfEmployee = {
  employeeCode: string | null;
  name: string;
  email: string | null;
  jobTitle: string | null;
  location: string | null;
  summary: string | null;
  updatedAtMs: number;
};

type PdfLedger = {
  type: string;
  description: string;
  statusDot: "amber" | "green" | "red" | null;
  dateMs: number;
};

function fileSafeName(value: string): string {
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

function addWrappedText({
  doc,
  text,
  x,
  y,
  width,
  lineHeight,
}: {
  doc: import("jspdf").jsPDF;
  text: string;
  x: number;
  y: number;
  width: number;
  lineHeight: number;
}) {
  const lines = doc.splitTextToSize(text, width) as string[];
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function PrintEmployeeFileButton({
  employee,
  ledger,
}: {
  employee: PdfEmployee;
  ledger: PdfLedger[];
}) {
  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;
    const generatedAt = new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());

    function ensureSpace(y: number, needed = 72) {
      if (y + needed <= pageHeight - margin) return y;
      doc.addPage();
      return margin;
    }

    doc.setFillColor(17, 17, 20);
    doc.rect(0, 0, pageWidth, 122, "F");
    doc.setTextColor(244, 239, 231);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(employee.name, margin, 62);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(190, 186, 177);
    doc.text("Skylar employee file", margin, 86);
    doc.text(`Exported ${generatedAt}`, margin, 102);

    let y = 156;
    doc.setTextColor(17, 17, 17);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PROFILE", margin, y);
    y += 22;

    const profileRows = [
      ["Employee code", employee.employeeCode ?? "Not set"],
      ["Email", employee.email ?? "Not set"],
      ["Role", employee.jobTitle ?? "Not set"],
      ["Location", employee.location ?? "Not set"],
      ["Last updated", dateLabel(employee.updatedAtMs)],
    ];

    doc.setFontSize(10);
    for (const [label, value] of profileRows) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(90, 88, 82);
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(17, 17, 17);
      doc.text(value, margin + 110, y);
      y += 18;
    }

    if (employee.summary) {
      y += 14;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(90, 88, 82);
      doc.text("Summary", margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(17, 17, 17);
      y = addWrappedText({
        doc,
        text: employee.summary,
        x: margin,
        y,
        width: contentWidth,
        lineHeight: 14,
      });
    }

    y += 28;
    y = ensureSpace(y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);
    doc.text("HISTORY", margin, y);
    y += 22;

    if (ledger.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90, 88, 82);
      doc.text("No saved notes or conversations yet.", margin, y);
    } else {
      ledger.forEach((entry, index) => {
        y = ensureSpace(y, 92);
        const rowTop = y - 10;
        doc.setDrawColor(220, 216, 207);
        if (index > 0) doc.line(margin, rowTop, pageWidth - margin, rowTop);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(90, 88, 82);
        doc.text(`${dateLabel(entry.dateMs)} · ${entry.type.toUpperCase()} · ${statusLabel(entry.statusDot)}`, margin, y);
        y += 17;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(17, 17, 17);
        y = addWrappedText({
          doc,
          text: entry.description,
          x: margin,
          y,
          width: contentWidth,
          lineHeight: 14,
        });
        y += 18;
      });
    }

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 116, 108);
      doc.text(`Skylar employee file · ${employee.name}`, margin, pageHeight - 28);
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin - 52, pageHeight - 28);
    }

    doc.save(`${fileSafeName(employee.name)}-employee-file.pdf`);
  }

  return (
    <button
      type="button"
      onClick={() => void exportPdf()}
      className="inline-flex items-center gap-2 rounded-full bg-paper/[0.075] px-3 py-2 text-sm font-semibold text-paper-2 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.05)] transition-colors hover:bg-paper hover:text-ink"
      aria-label={`Export ${employee.name}'s employee file as PDF`}
      title="Export PDF"
    >
      <Download className="size-4" aria-hidden="true" />
      Export PDF
    </button>
  );
}
