import { requireAdvisor } from "@/server/auth/advisor-access";
import { errorResponse } from "@/server/http/error-response";
import { sseResponse } from "@/server/http/sse";
import { getLiveCaseForAdvisor, watchCase, type LiveCaseDetail } from "@/server/repositories/advisor-live.repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: { escalationId: string } };

const fingerprint = (detail: LiveCaseDetail) =>
  JSON.stringify([detail.case.status, detail.case.phase, detail.case.claimedByUid, detail.case.reopenCount, detail.messages.map((message) => message.id)]);

/**
 * One case on the desk as server-sent events. Opening it is audited once (and not again for a while, so the
 * automatic reconnects don't flood the log); later updates on the same stream are not.
 */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const advisor = await requireAdvisor();
    // Opening the stream is the advisor reading the case, so it is audited here like any other read.
    const first = await getLiveCaseForAdvisor(params.escalationId, advisor);

    return sseResponse(request, ({ send, close }) => {
      let last = fingerprint(first);
      let busy = false;
      let again = false;
      send("case", first);

      const push = async () => {
        if (busy) {
          again = true;
          return;
        }
        busy = true;
        try {
          do {
            again = false;
            const detail = await getLiveCaseForAdvisor(params.escalationId, advisor, { audit: false });
            const next = fingerprint(detail);
            if (next !== last) {
              last = next;
              send("case", detail);
            }
          } while (again);
        } catch {
          send("gone", {});
          close();
        } finally {
          busy = false;
        }
      };

      return watchCase(params.escalationId, () => void push(), () => {
        send("fatal", { message: "The live connection failed." });
        close();
      });
    });
  } catch (error) {
    return errorResponse(error, "GET /api/advisor/stream/[escalationId]");
  }
}
