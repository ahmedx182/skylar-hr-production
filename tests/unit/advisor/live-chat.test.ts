import { describe, expect, it } from "vitest";
import {
  TRANSFER_MESSAGE_AFTER_HOURS,
  TRANSFER_MESSAGE_IN_HOURS,
  transferMessage,
  waitingNote,
  canAdvisorReply,
  canClaimCase,
  canReopenCase,
  canTakeOverCase,
  canUserSend,
  cleanLiveMessage,
  liveChatPhase,
  shouldReopenInsteadOfNew,
  shouldSendLiveNotification,
  LIVE_MESSAGE_MAX_LENGTH,
} from "@/features/advisor/live-chat";

describe("live advisor chat rules", () => {
  it("shows waiting until an advisor claims, then connected, then closed", () => {
    expect(liveChatPhase("with_advisor", null)).toBe("waiting");
    expect(liveChatPhase("with_advisor", "adv1")).toBe("connected");
    expect(liveChatPhase("resolved", "adv1")).toBe("closed");
    expect(liveChatPhase("closed", null)).toBe("closed");
  });

  it("lets the first advisor claim and blocks a second one", () => {
    expect(canClaimCase("with_advisor", null, "adv1")).toBe(true);
    expect(canClaimCase("with_advisor", "adv1", "adv2")).toBe(false);
    expect(canTakeOverCase("with_advisor", "adv1", "adv2")).toBe(true);
    expect(canTakeOverCase("with_advisor", "adv1", "adv1")).toBe(false);
    expect(canClaimCase("resolved", null, "adv1")).toBe(false);
  });

  it("only the owning advisor can reply, and only while open", () => {
    expect(canAdvisorReply("with_advisor", "adv1", "adv1")).toBe(true);
    expect(canAdvisorReply("with_advisor", "adv1", "adv2")).toBe(false);
    expect(canAdvisorReply("with_advisor", null, "adv1")).toBe(false);
    expect(canAdvisorReply("resolved", "adv1", "adv1")).toBe(false);
  });

  it("lets a closed case be reopened at any time but not an open one", () => {
    expect(canReopenCase("resolved")).toBe(true);
    expect(canReopenCase("closed")).toBe(true);
    expect(canReopenCase("with_advisor")).toBe(false);
    expect(canReopenCase("responded")).toBe(false);
    expect(canUserSend("resolved")).toBe(false);
    expect(canUserSend("with_advisor")).toBe(true);
  });

  it("trims and caps messages", () => {
    expect(cleanLiveMessage("  hello  ")).toBe("hello");
    expect(cleanLiveMessage("x".repeat(LIVE_MESSAGE_MAX_LENGTH + 50))).toHaveLength(LIVE_MESSAGE_MAX_LENGTH);
  });

  it("throttles new-message emails", () => {
    expect(shouldSendLiveNotification(null, 1_000_000)).toBe(true);
    expect(shouldSendLiveNotification(1_000_000 - 60_000, 1_000_000)).toBe(false);
    expect(shouldSendLiveNotification(1_000_000 - 10 * 60_000, 1_000_000)).toBe(true);
  });

  describe("what the manager is told", () => {
    it("uses Skylar's exact transfer wording, with the safe interim tips", () => {
      expect(TRANSFER_MESSAGE_IN_HOURS).toBe(
        "We believe that this issue requires an escalation to one of our Live (Human) HR Advisors. We are transferring this now to your advisor. It may take up to an hour for the advisor to respond. You may leave the app and you will be notified when your advisor has read the case. In the meantime, hold off acting, write down all the facts and dates, keep it confidential.",
      );
      expect(TRANSFER_MESSAGE_IN_HOURS).toContain("hold off acting, write down all the facts and dates, keep it confidential");
    });

    it("says up to 6 hours outside working hours, and that they can close the app", () => {
      expect(TRANSFER_MESSAGE_AFTER_HOURS).toContain("Your advisor has been notified and may take up to 6 hours to respond. You can close the app and we will notify you when your advisor has reviewed.");
      expect(TRANSFER_MESSAGE_AFTER_HOURS).toContain("hold off acting, write down all the facts and dates, keep it confidential");
      expect(TRANSFER_MESSAGE_AFTER_HOURS).not.toContain("up to an hour");
      expect(transferMessage(true)).toBe(TRANSFER_MESSAGE_AFTER_HOURS);
      expect(transferMessage(false)).toBe(TRANSFER_MESSAGE_IN_HOURS);
    });

    it("tells a waiting manager the matching wait", () => {
      expect(waitingNote(true)).toContain("up to 6 hours");
      expect(waitingNote(false)).toContain("up to an hour");
    });
  });
});
