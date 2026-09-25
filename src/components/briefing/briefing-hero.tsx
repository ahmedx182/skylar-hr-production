"use client";

import { useEffect, useState } from "react";
import { BriefingProgress } from "@/components/briefing/briefing-progress";

const slides = [
  {
    eyebrow: "Good morning",
    title: "Let’s handle today’s HR follow-up with care.",
    body: "You have one conversation that deserves attention. Skylar keeps the context, plan, and record close by.",
    cueTitle: "Start here",
    cue: "Review the guide, have the check-in, then save a short note.",
    image: "/briefing/manager-follow-up.png",
  },
  {
    eyebrow: "Before you talk",
    title: "Go in calm, clear, and ready to listen.",
    body: "A good follow-up starts with context. Ask what changed before you restate expectations.",
    cueTitle: "Try this",
    cue: "Open with one gentle question, then let the conversation breathe.",
    image: "/briefing/manager-conversation.png",
  },
  {
    eyebrow: "Afterward",
    title: "Capture the outcome while it’s still fresh.",
    body: "Save the agreed next step, the follow-up date, and only the details that belong in the record.",
    cueTitle: "Finish well",
    cue: "File a short note so tomorrow’s briefing has the right context.",
    image: "/briefing/manager-note.png",
  },
] as const;

export function BriefingHero() {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];

  useEffect(() => {
    const id = window.setInterval(() => {
      setCurrent((value) => (value + 1) % slides.length);
    }, 6000);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-[210px] overflow-hidden rounded-[30px] bg-ink shadow-[0_24px_70px_rgba(0,0,0,0.20),inset_0_0_0_1px_rgba(244,239,231,0.04),inset_0_1px_0_rgba(244,239,231,0.07)]">
      {slides.map((item, index) => (
        <div
          key={item.image}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 motion-reduce:transition-none"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(11,11,14,0.96) 0%, rgba(11,11,14,0.84) 36%, rgba(11,11,14,0.40) 70%, rgba(11,11,14,0.18) 100%), url('${item.image}')`,
            opacity: index === current ? 1 : 0,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(244,239,231,0.10),transparent_26%),linear-gradient(180deg,rgba(244,239,231,0.04),transparent_42%)]" />
      <div className="relative flex min-h-[210px] flex-col justify-between p-5 md:p-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase text-attention">{slide.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
            {slide.title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-paper-2 md:text-base">
            {slide.body}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-sm rounded-[24px] bg-paper/[0.11] px-4 py-3 text-paper shadow-[0_18px_50px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(244,239,231,0.08),inset_0_1px_0_rgba(244,239,231,0.12)]">
            <p className="font-mono text-xs uppercase text-paper-3">{slide.cueTitle}</p>
            <p className="mt-2 text-sm leading-6 text-paper-2">{slide.cue}</p>
          </div>
          <div className="flex w-fit items-center gap-4 rounded-[24px] bg-paper/[0.09] px-4 py-3 shadow-[0_16px_42px_rgba(0,0,0,0.20),inset_0_0_0_1px_rgba(244,239,231,0.075),inset_0_1px_0_rgba(244,239,231,0.11)]">
            <BriefingProgress total={slides.length} current={current} />
            <div>
              <p className="text-2xl font-semibold leading-none">
                {String(current + 1).padStart(2, "0")}
              </p>
              <p className="mt-1 font-mono text-xs uppercase leading-5 text-paper-3">
                of {String(slides.length).padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
