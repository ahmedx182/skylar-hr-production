export function SkylarMessageText({ text }: { text: string }) {
  const lines = text.replace(/\s+-\s+(?=\*\*)/g, "\n- ").split("\n");

  return (
    <div className="grid gap-2">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <span key={`space-${index}`} className="h-1" aria-hidden="true" />;
        if (trimmed.startsWith("#")) {
          return (
            <p key={`heading-${index}`} className="text-base font-semibold leading-6">
              {formatSkylarInline(trimmed.replace(/^#+\s*/, ""))}
            </p>
          );
        }
        const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numbered) {
          return (
            <div key={`number-${index}`} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2">
              <span className="font-semibold tabular-nums text-ink/55">{numbered[1]}.</span>
              <span>{formatSkylarInline(numbered[2])}</span>
            </div>
          );
        }
        if (trimmed.startsWith("- ")) {
          return (
            <div key={`bullet-${index}`} className="flex gap-2">
              <span className="mt-[0.65em] size-1.5 shrink-0 rounded-full bg-ink/45" aria-hidden="true" />
              <span>{formatSkylarInline(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={`line-${index}`}>{formatSkylarInline(trimmed)}</p>;
      })}
    </div>
  );
}

function formatSkylarInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}
