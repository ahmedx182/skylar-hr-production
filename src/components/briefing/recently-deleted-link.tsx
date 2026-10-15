import Link from "next/link";
import { Trash2 } from "lucide-react";
import { RECENTLY_DELETED_PATH } from "@/constants/routes";

export function RecentlyDeletedLink() {
  return (
    <Link
      href={RECENTLY_DELETED_PATH}
      className="inline-flex h-9 items-center gap-2 rounded-full bg-paper/[0.08] px-4 text-xs font-semibold text-paper-2 transition-colors hover:bg-paper hover:text-ink"
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
      Recently deleted
    </Link>
  );
}
