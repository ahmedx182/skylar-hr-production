"use client";

import { Download } from "lucide-react";
import { buildEmployeeFilePdf, fileSafeName, type PdfEmployee, type PdfLedger } from "@/features/briefing/employee-file-pdf";

export function PrintEmployeeFileButton({
  employee,
  ledger,
}: {
  employee: PdfEmployee;
  ledger: PdfLedger[];
}) {
  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = buildEmployeeFilePdf(jsPDF, employee, ledger);
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
