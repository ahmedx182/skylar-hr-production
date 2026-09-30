# 07 — Open Decisions & Traceability
**Skylar HR Assistant — v2 "Briefing Room"**

---

## Decision Log

| # | Question | Status | Owner | Due | Impact If Delayed |
|---|---|---|---|---|---|
| 1 | Repository state | **Resolved — confirmed empty.** Build proceeds from scratch per Document 05's 2-week plan. | — | — | — |
| 2 | Design file access | **Resolved — real exports received** (design system v2, Live-in-5, Conversation, Escalation, Employee Timeline, Dashboard, all v1/v2). Ahmed also has direct Claude Design workspace access. | — | — | — |
| 3 | Timeline | **Resolved — 2 weeks, confirmed by product owner.** Plan in Document 05. | — | — | — |
| 4 | Exact date/time/timezone for the first client check-in | **Still open.** | Paolo | Immediately | Delivery plan's check-in structure remains a placeholder |
| 5 | Dedicated production Firebase project | Confirm before Ahmed builds auth — a fresh project is needed regardless, since the repo is empty and there's no pilot-era config to accidentally inherit | Paolo | Before Day 1–2 of build | Low risk given confirmed-empty repo, but still needs an actual project created |
| 6 | Which Claude model the production Anthropic account can access | Verify directly, don't assume | Ahmed | Day 1 | Repeat of an earlier pilot-phase incident |
| 7 | Who at Skylar needs escalation queue access, and access model | Real role-based auth still recommended over a shared-password pattern | Paolo/Skylar | Before FR-11 is built | Affects that feature's auth design |
| 8 | Terms of Service / Privacy Policy | Still needed before launch; not to be drafted by engineering | Paolo/Skylar legal | Before launch | Blocks launch credibility and, later, app store approval |
| 9 | Named UAT approver at Skylar | Recommend Lauren and/or Evan personally test Live-in-5 and Escalation before any client sees the product | Skylar | Before launch | No independent verification of the two flows the business model depends on |
| 10 | Apple/Google developer account enrollment | Confirm now — irrelevant to the 2-week web timeline but relevant to not losing time in October | Paolo | Before October | Could delay mobile independent of dev work |
| 11 | **New:** advisor assignment for escalations — is there one named advisor for MVP, or an assignment rule? | The sealed-state design shows a specific named advisor ("Renée Alvarez") — confirm whether this is hardcoded for MVP or needs real assignment logic | Paolo/Skylar | Before FR-10/11 is built | Affects whether escalation routing is trivial or needs real logic |
| 12 | **New:** keyboard-accessible equivalent for the press-and-hold escalation gesture | Design doesn't specify one | Paolo/design | Before FR-10 is built | Accessibility gap on the product's single highest-stakes interaction |

---

## Traceability

Rev. 1's traceability table mapped requirements to a design that "pending export" for every row. That's resolved now — every launch-critical FR in Document 01 maps to a specific, named screen in the received design exports (The Briefing, Live-in-5 beats 1–6, Conversation, Escalation, Employee File), all detailed in Document 02. No requirement in Document 01 lacks a design reference as of this revision.

---

## Consistency Review

- The product direction changed meaningfully between rev. 1 and this revision (dashboard/sidebar → card-sequence "Briefing Room"). This has been fully propagated through Documents 00, 01, 02, 03, and 05. **Documents 04 and 06 were patched, not rewritten** — Document 06's test plan in particular should be re-read against the new architecture (e.g., "test the dashboard" should now read as "test the Briefing sequence") even though its structure and intent still hold.
- No coverage gaps identified between Document 01's requirements and the received design — the two new open questions (#11, #12 above) are decisions the design itself doesn't fully specify, not gaps in what was reviewed.

## Revised Candid Assessment

The two largest uncertainties from rev. 1 — actual repo state and actual design fidelity — are both resolved, and resolved favorably: an empty repo is a clean start, not a mess to untangle, and the design received is unusually complete and specific (down to exact animation timing and working reference interaction logic). Combined with the confirmed 2-week timeline, this handoff can now say plainly: **this is buildable as scoped**, provided the still-open items above (particularly #4, #7, #11, #12) get resolved in the first day or two rather than mid-build.
