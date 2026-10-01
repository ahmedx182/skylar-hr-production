export type BriefingTone = "attention" | "success" | "risk" | "neutral";

export type BriefingAction = {
  label: string;
  kind:
    | "prepare"
    | "next"
    | "not_now"
    | "finish"
    | "open_file"
    | "add_note"
    | "add_person"
    | "escalate"
    | "open_profile";
  tone?: BriefingTone;
};

export type GuideStep = {
  label: string;
  title: string;
  body: string;
};

export type BriefingCard = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  detail?: string;
  subject?: string;
  subjectRole?: string;
  dueLabel?: string;
  tone: BriefingTone;
  actions: BriefingAction[];
  employeeId?: string;
  ledgerEntryId?: string;
  /** Conversation guide specific to this brief; the card falls back to a generic guide when absent. */
  guide?: GuideStep[];
};
