"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LOGIN_PATH } from "@/constants/routes";
import { endServerSession } from "@/features/auth/session-client";

export function LogoutButton({ children }: { children?: ReactNode }) {
  const [isPending, setIsPending] = useState(false);

  async function logout() {
    setIsPending(true);
    try {
      await endServerSession();
      window.location.replace(LOGIN_PATH);
    } catch {
      window.location.replace(LOGIN_PATH);
    }
  }

  return (
    <div>
      <Button
        variant="secondary"
        onClick={logout}
        disabled={isPending}
        aria-label={children ? "Sign out" : undefined}
        className={children ? "h-11 w-full gap-2 px-3" : undefined}
      >
        {isPending ? "..." : children ?? "Sign out"}
      </Button>
    </div>
  );
}
