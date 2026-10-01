import { describe, expect, it } from "vitest";
import { humanizeText } from "@/lib/humanize-text";

describe("humanizeText", () => {
  it("replaces spaced em dashes with a comma", () => {
    expect(humanizeText("Write down what Ahmed told you — date, time and words.")).toBe(
      "Write down what Ahmed told you, date, time and words.",
    );
  });

  it("replaces unspaced dashes and double hyphens too", () => {
    expect(humanizeText("Stay calm—and listen")).toBe("Stay calm, and listen");
    expect(humanizeText("Stay calm -- and listen")).toBe("Stay calm, and listen");
    expect(humanizeText("Nine – five")).toBe("Nine, five");
  });

  it("leaves ordinary hyphens and text alone", () => {
    expect(humanizeText("A follow-up check-in is fine.")).toBe("A follow-up check-in is fine.");
    expect(humanizeText("")).toBe("");
  });
});
