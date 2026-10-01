import type { BriefingTone, GuideStep } from "./types";

const FALLBACK_NAME = "the employee";

/** Guide for a saved ledger entry (note or conversation), chosen by how urgent the brief is. */
export function ledgerGuide({
  tone,
  type,
  employeeName,
}: {
  tone: BriefingTone;
  type: string;
  employeeName: string | null | undefined;
}): GuideStep[] {
  const name = employeeName || FALLBACK_NAME;

  if (tone === "risk") {
    return [
      { label: "Open", title: "State the concern plainly", body: `Name what the record says about ${name}, with specifics and no assumptions.` },
      { label: "Listen", title: "Hear their side first", body: `Ask for ${name}'s view before drawing any conclusions.` },
      { label: "Close", title: "Agree actions and consequences", body: "Confirm what happens next, set a date, and decide whether HR review is needed." },
    ];
  }

  if (tone === "success") {
    return [
      { label: "Open", title: "Acknowledge the progress", body: `Tell ${name} what improved and why it mattered.` },
      { label: "Listen", title: "Ask what helped", body: `Find out what ${name} found useful so it can be repeated.` },
      { label: "Close", title: "Keep it on track", body: "Agree how to keep this going, and close the follow-up if it is done." },
    ];
  }

  if (type === "conversation") {
    return [
      { label: "Open", title: "Recap the saved conversation", body: `Re-read the transcript and start from what you and ${name} already covered.` },
      { label: "Listen", title: "Check what has changed", body: `Ask ${name} how things have gone since that conversation.` },
      { label: "Close", title: "Confirm the agreed step", body: "Record the outcome and any follow-up date." },
    ];
  }

  return [
    { label: "Open", title: "Start from the note", body: `Mention the saved note so ${name} knows what you are following up on.` },
    { label: "Listen", title: "Look for context", body: `Give ${name} room to explain what changed.` },
    { label: "Close", title: "Agree one next step", body: "End with a clear expectation and a follow-up date." },
  ];
}

/** Guide for an employee file that has no saved notes driving the brief. */
export function employeeFileGuide(name: string): GuideStep[] {
  return [
    { label: "Open", title: "Start with their work", body: `Ask ${name} how work has been going lately.` },
    { label: "Listen", title: "Fill in the gaps", body: `This file has little history, so ask ${name} about workload, goals and support needs.` },
    { label: "Close", title: "Save what you learn", body: "Add a note with the agreed next step." },
  ];
}
