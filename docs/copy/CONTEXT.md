# Skylar App Copy: Working Context

Source: `skylar-app-experience-copy-alternatives-2026-11-04.docx` (same folder). It is the only version that keeps Lauren's yellow highlights, which are her picks. The `.md` next to it lost them. This file is the distilled brief. Open the source for the exact wording of each alternative.

## What the doc is

A copy review for the landing page, signup, and sign-in. Each of 23 sections has the Oct 27 baseline (the live text then) plus Alternatives A, B and C. Reviewer notes in the doc are the only decisions made so far. They are listed below.

## Controlling brief (Lauren's landing-page notes)

- Positioning: **a thinking partner for founders and small-company leaders.** Human HR judgment is clearly separated from AI guidance.
- Offer: **14-day free trial, no credit card required, unlimited chat with Skylar AI, one free escalation to a human Skylar HR professional.**
- Upgrade: **$149/month.**
- The 30-day friends-and-family offer is not the standard offer.
- Baseline text is for comparison only. It is not current product truth.

## Product facts the new copy must match

The copy shifts away from the Oct 27 story (briefing room, 4-hour advisor SLA, Free $0 forever, 5 advisor messages, $49 Professional).

| Topic | New direction | Baseline being replaced |
|---|---|---|
| Plans | 14-day trial, then paid at $149/month | Free forever (5 advisor messages) + Professional $49 |
| AI chat | Unlimited during trial | 5 advisor messages |
| Human HR | One free escalation in trial | Named advisor, 4-hour response |
| Proof points | Benefit-led labels, no timing claims | "< 5 min", "4 hrs", "100%" |
| Sign-in | Email link, no password | Same (unchanged) |

## Decisions recorded in the doc

1. **How it works (§11):** use B's frame, "A colleague to think with. A professional to turn to." / "Try Skylar for 14 days".
   - Step 01: "Start with one situation". It merges B-01 with the plan/script/documentation step, and the description is "Describe the employee situation in your own words. Work through the facts and a possible next step."
   - Step 02: **keep the daily briefing as the focus.** It is a core function. The AI helps create the plan, and it also tracks next steps, urgency and reminders. Wording is still to be written.
   - Step 03: "Get a person's perspective" (C), "One free escalation is included in your trial."
2. **Action plan (§6):** the value (an action plan) must be reachable within minutes of signing up. Say so in the copy.
3. **Paid plan (§14):** keep the name **Professional**. Stripe still handles transactions. Cancel any time (this may change with retention trends).
4. **Escalation credits (§14):** the team has discussed a per-month escalation credit on the paid plan (3-5?) to control early volume. **Not decided. Needs more discussion.**
5. **Team access FAQ (§15):** reject A, B and C. Users must not have to contact us to add teammates, because that adds friction. Baseline behavior stands: admins invite teammates from Settings.
6. **Privacy FAQ (§17):** a lawyer (a friend of Evan's) will review T&C and the privacy policy. Paolo's team supplied the drafts. Link to the policy and invent no security claims.

## Open items and do-not-promise list

Do not write any of these until confirmed:

- Human-response deadline or SLA.
- Automatic routing, named-advisor assignment, case-history transfer.
- Paid-plan human-support allowance. Do not infer unlimited human advice from unlimited AI chat.
- What happens at trial end (auto-charge, continued free access, expiry).
- Billing unit (per workspace vs per seat) and cancellation terms for the $149 plan.
- Old entitlements (unlimited seats/employees, PDF exports, escalation routing). Do not carry them over without confirmation.
- Terms and Privacy contents (not reviewed; they must be ready before publication).

## Section map

| § | Section | | § | Section |
|---|---|---|---|---|
| 2 | Hero | | 13 | Free plan -> trial card |
| 3 | Hero proof points | | 14 | Professional plan |
| 4 | Illustrative briefing card | | 15 | FAQ: team access |
| 5 | Product introduction | | 16 | FAQ: message limit -> trial contents |
| 6 | Feature: action plan | | 17 | FAQ: privacy |
| 7 | Feature: employee memory | | 18 | Closing invitation |
| 8 | Feature: advisor escalation | | 19 | Footer |
| 9 | Feature: daily briefing | | 20 | Create a workspace (`/signup`) |
| 10 | Before / after comparison | | 21-23 | Sign-in intro, email form, reassurance (`/login`) |
| 11 | How it works | | | |
| 12 | Pricing intro | | | |

## Lauren's picks (yellow highlights in the .docx)

| § | Pick |
|---|---|
| 2 Hero | B |
| 3 Proof points | C |
| 4 Briefing card | Baseline "Skylar Briefing" label, B headline and body, A checklist ("Review talking points / Review draft / Save to employee file") |
| 5 Product intro | A |
| 6 Action plan | A text, keeping the baseline "in under five minutes" |
| 7 Employee memory | A |
| 8 Advisor escalation | B |
| 9 Daily briefing | A body, B title ("A clear place to start") |
| 10 Before/after | A headers, B items |
| 11 How it works | Merged (see above) |
| 12 Pricing intro | B |
| 13 Free plan | C (trial card) |
| 14 Professional | B ("Keep the conversation going", $149/month), name stays Professional |
| 15 Team FAQ | None (baseline) |
| 16 Trial FAQ | A |
| 17 Privacy FAQ | None (baseline; lawyer review pending) |
| 18 Closing | B |
| 19 Footer | B |
| 20 Create workspace | B |
| 21 Sign-in intro | A |
| 22 Email form | None (baseline) |
| 23 Reassurance | C |

§13 and §14 now appear on the landing page as static cards (trial card and Professional $149/month). The landing page no longer reads the database packages. The 14-day trial already existed. The escalation allowance (trial 1, paid 3 a month) is now enforced for a manager's own requests. Billing charges whatever the live Professional package says, so set it to $149 in the platform pricing manager.

## Code impact to check before applying

- Signup and billing already follow the flow in `PROJECT_MEMORY.md` (verified email, any domain, admin team invites). Copy that says "free forever" or "5 advisor messages" is stale against the new offer. The product may also need a trial and escalation-count mechanism before the offer is true. See `live-advisor-escalation-plan.md`, which holds the current escalation design.
- Pages in scope: landing, `/signup`, `/login`, pricing and billing surfaces.
- The doc did not re-audit the site or product. Verify each claim against the shipped behavior before publishing.
