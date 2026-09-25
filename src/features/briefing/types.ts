export type BriefingTone = "attention" | "success" | "risk" | "neutral";

export type BriefingAction = {
  label: string;
  tone?: BriefingTone;
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
};
