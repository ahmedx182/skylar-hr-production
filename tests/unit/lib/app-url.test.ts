import { describe, expect, it } from "vitest";
import { normalizeAppUrl } from "@/lib/app-url";

describe("normalizeAppUrl", () => {
  it.each([
    ["https://www.askskylarhr.com", "https://www.askskylarhr.com"],
    ["https://www.askskylarhr.com/", "https://www.askskylarhr.com"],
    ["www.askskylarhr.com", "https://www.askskylarhr.com"],
    ["  askskylarhr.com  ", "https://askskylarhr.com"],
    ['"https://askskylarhr.com"', "https://askskylarhr.com"],
    ["http://localhost:3000", "http://localhost:3000"],
  ])("turns %j into %j", (input, expected) => {
    expect(normalizeAppUrl(input)).toBe(expected);
  });

  it.each(["", "   ", undefined, "ftp://example.com", "https://"])("returns undefined for %j", (input) => {
    expect(normalizeAppUrl(input)).toBeUndefined();
  });
});
