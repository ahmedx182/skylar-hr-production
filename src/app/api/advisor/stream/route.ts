import { requireAdvisor } from "@/server/auth/advisor-access";
import { errorResponse } from "@/server/http/error-response";
import { sseResponse } from "@/server/http/sse";
import { watchLiveCases } from "@/server/repositories/advisor-live.repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The advisor desk's queue as server-sent events: the whole list now, and again whenever any case changes. */
export async function GET(request: Request) {
  try {
    await requireAdvisor();

    return sseResponse(request, ({ send, close }) => {
      let last = "";
      return watchLiveCases(
        (cases) => {
          const next = JSON.stringify(cases.map((item) => [item.id, item.status, item.phase, item.claimedByUid, item.claimedByName, item.reopenCount, item.lastMessageAtMs, item.lastMessageSender]));
          if (next === last) return;
          last = next;
          send("cases", cases);
        },
        () => {
          send("fatal", { message: "The live connection failed." });
          close();
        },
      );
    });
  } catch (error) {
    return errorResponse(error, "GET /api/advisor/stream");
  }
}
