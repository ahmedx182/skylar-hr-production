"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BRIEFING_PATH, DEFERRED_PATH } from "@/constants/routes";
import { requireSession } from "@/server/auth/require-session";
import { resumeDeferredBriefingCard } from "@/server/repositories/briefing-action.repository";

const resumeDeferredSchema = z.object({
  cardId: z.string().trim().min(1),
});

export async function resumeDeferredCardAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const input = resumeDeferredSchema.parse({
    cardId: formData.get("cardId"),
  });

  await resumeDeferredBriefingCard(session, input.cardId);
  revalidatePath(DEFERRED_PATH);
  revalidatePath(BRIEFING_PATH);
}
