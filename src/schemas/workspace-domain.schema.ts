import { z } from "zod";

export const workspaceDomainSchema = z.string().trim().toLowerCase().max(253).regex(
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
  "Enter a domain such as company.com, without @ or https://.",
);
export const workspaceDomainsSchema = z.array(workspaceDomainSchema).max(20).transform(domains => Array.from(new Set(domains)));

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@").at(-1) ?? "";
}

export function emailMatchesDomains(email: string, domains: string[]): boolean {
  return domains.length === 0 || domains.includes(emailDomain(email));
}
