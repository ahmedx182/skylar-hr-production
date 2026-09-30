import { cleanLedgerMarkdown } from "@/features/briefing/ledger-display";

export function FormattedLedgerDescription({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="grid gap-4 text-lg leading-8 text-ink/75">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "---") return <span key={`space-${index}`} className="h-1" aria-hidden="true" />;

        if (trimmed.startsWith("#")) {
          return (
            <h2 key={`heading-${index}`} className="pt-2 text-xl font-semibold leading-8 text-ink">
              {formatInline(cleanLedgerMarkdown(trimmed))}
            </h2>
          );
        }

        const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numbered) {
          return (
            <div key={`number-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-2">
              <span className="font-mono text-base text-ink/45">{numbered[1]}.</span>
              <span>{formatInline(numbered[2])}</span>
            </div>
          );
        }

        if (/^[-*]\s+/.test(trimmed)) {
          return (
            <div key={`bullet-${index}`} className="flex gap-3">
              <span className="mt-[0.85em] size-1.5 shrink-0 rounded-full bg-ink/45" aria-hidden="true" />
              <span>{formatInline(trimmed.replace(/^[-*]\s+/, ""))}</span>
            </div>
          );
        }

        return <p key={`line-${index}`}>{formatInline(trimmed)}</p>;
      })}
    </div>
  );
}

function formatInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <span key={index}>{part}</span>;
  });
}
