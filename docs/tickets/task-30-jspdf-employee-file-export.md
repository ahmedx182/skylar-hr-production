# TASK-30 — jsPDF Employee File Export

**Status:** Done

## Goal
Replace the browser print-based employee export with a real generated PDF file.

## Scope
- Add `jspdf`.
- Generate the employee profile and ledger history into a downloadable PDF.
- Include profile metadata, summary, history rows, generated timestamp, and page footer.
- Keep the export client-side so no employee file PDF endpoint is required.

## Acceptance
- Clicking `Export PDF` downloads a PDF instead of opening browser print.
- The PDF includes employee identity and full visible ledger history.
- Long history can flow onto additional pages.
