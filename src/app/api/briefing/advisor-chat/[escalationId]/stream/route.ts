import { requireRole } from "@/server/auth/require-role";
import { requireSession } from "@/server/auth/require-session";
import { errorResponse } from "@/server/http/error-response";
import { sseResponse } from "@/server/http/sse";
import { applyLivePause, getUserLiveCase, watchCase, type UserLiveCase } from "@/server/repositories/advisor-live.repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: { escalationId: string } };

const fingerprint = (chat: UserLiveCase) =>
  JSON.stringify([chat.phase, chat.advisorName, chat.canSend, chat.canReopen, chat.readOnly, chat.reopenCount, chat.messages.map((message) => message.id)]);

/**
 * The manager's live thread as server-sent events: the full thread now, then again whenever it changes.
 * Access is checked before the stream opens, so another workspace gets a normal 404, not a stream.
 */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const first = applyLivePause(await getUserLiveCase(session, params.escalationId));

    return sseResponse(request, ({ send, close }) => {
      let last = fingerprint(first);
      let busy = false;
      let again = false;
      send("chat", first);

      const push = async () => {
        if (busy) {
          again = true;
          return;
        }
        busy = true;
        try {
          do {
            again = false;
            const chat = applyLivePause(await getUserLiveCase(session, params.escalationId));
            const next = fingerprint(chat);
            if (next !== last) {
              last = next;
              send("chat", chat);
            }
          } while (again);
        } catch {
          // The case is gone (purged) or access changed.
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
    return errorResponse(error, "GET /api/briefing/advisor-chat/[escalationId]/stream");
  }
}
