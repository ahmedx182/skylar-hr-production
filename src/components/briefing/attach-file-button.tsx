import { Paperclip } from "lucide-react";

/** Placeholder for file upload in the chat. Disabled until uploads are supported. */
export function AttachFileButton() {
  return (
    <button
      type="button"
      disabled
      title="File upload is coming soon"
      aria-label="Attach file (coming soon)"
      className="grid size-11 shrink-0 cursor-not-allowed place-items-center rounded-lg text-paper-3 opacity-45"
    >
      <Paperclip className="size-4" aria-hidden="true" />
    </button>
  );
}
