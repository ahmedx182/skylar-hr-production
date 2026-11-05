/**
 * A readable name for someone whose account name is just the start of their email ("ana.lopez" or "ahmed").
 * A name that already has spaces is assumed to be written as they like it and is left alone.
 */
export function friendlyName(raw: string | null | undefined, fallback = "Skylar advisor"): string {
  const value = (raw ?? "").trim();
  if (!value) return fallback;
  const local = value.includes("@") ? value.split("@")[0] : value;
  if (/\s/.test(local)) return local;
  const words = local.split(/[._-]+/).filter(Boolean);
  const name = words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
  return name || fallback;
}
