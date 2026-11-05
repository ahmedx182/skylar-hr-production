import { requireRole } from "@/server/auth/require-role";
import { requireSession } from "@/server/auth/require-session";
import { errorResponse } from "@/server/http/error-response";
import { sseResponse } from "@/server/http/sse";
import { watchUserNotices } from "@/server/repositories/advisor-live.repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * A manager's advisor chats as notifications, wherever they are in the app: when HR joins, replies or closes.
 * It carries no message text, only who did what on which case, so it is safe to show in a pop-up.
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    requireRole(session, ["admin"]);

    return sseResponse(request, ({ send, close }) => {
      let last = "";
      return watchUserNotices(
        session,
        (notices) => {
          const next = JSON.stringify(notices);
          if (next === last) return;
          last = next;
          send("notices", notices);
        },
        () => {
          send("fatal", { message: "The live connection failed." });
          close();
        },
      );
    });
  } catch (error) {
    return errorResponse(error, "GET /api/briefing/advisor-notices");
  }
}
