"use client";

import { Check, Copy, Mail } from "lucide-react";
import { useState } from "react";

export function CopyEmailButton({ email }: { email: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!email) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-paper-3">
        <Mail className="size-4 shrink-0 text-sun/90" aria-hidden="true" />
        <span>Not added</span>
      </span>
    );
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyEmail}
      title={copied ? "Email copied" : "Copy work email"}
      aria-label={copied ? "Email copied" : `Copy work email ${email}`}
      className="group inline-flex min-w-0 max-w-full items-center gap-2 text-left text-sm transition-colors hover:text-sun"
    >
      {copied ? (
        <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
      ) : (
        <Mail className="size-4 shrink-0 text-sun/90" aria-hidden="true" />
      )}
      <span className="break-all font-semibold text-paper group-hover:text-sun">
        {email}
      </span>
      <Copy className="size-3.5 shrink-0 text-paper-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
    </button>
  );
}
