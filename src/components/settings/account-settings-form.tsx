"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save } from "lucide-react";
import {
  updateAccountSettingsAction,
  type AccountSettingsState,
} from "@/features/auth/account-settings-actions";

export function AccountSettingsForm({
  displayName,
  companyName,
  canEditCompany,
}: {
  displayName: string;
  companyName: string;
  canEditCompany: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<AccountSettingsState | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit(formData: FormData) {
    setIsPending(true);
    setState(null);
    const result = await updateAccountSettingsAction({
      displayName: String(formData.get("displayName") ?? ""),
      companyName: String(formData.get("companyName") ?? companyName),
    });
    setState(result);
    setIsPending(false);
    if (result.ok) router.refresh();
  }

  return (
    <form action={submit} className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-paper">Your name</span>
        <input
          name="displayName"
          defaultValue={displayName}
          placeholder="Add your name"
          className="h-12 rounded-xl border border-paper/[0.08] bg-paper/[0.055] px-4 text-paper outline-none transition-colors placeholder:text-paper-3 focus:border-paper/25"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-paper">Workspace name</span>
        <input
          name="companyName"
          defaultValue={companyName}
          disabled={!canEditCompany}
          className="h-12 rounded-xl border border-paper/[0.08] bg-paper/[0.055] px-4 text-paper outline-none transition-colors placeholder:text-paper-3 focus:border-paper/25 disabled:opacity-55"
        />
        {!canEditCompany && (
          <span className="text-xs text-paper-3">Only admins can rename the workspace.</span>
        )}
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-paper px-5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          <Save className="size-4" aria-hidden="true" />
          {isPending ? "Saving..." : "Save settings"}
        </button>
        {state && (
          <p className={`text-sm font-semibold ${state.ok ? "text-success" : "text-risk"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
