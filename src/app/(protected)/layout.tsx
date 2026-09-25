import { requirePageSession } from "@/server/auth/require-session";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Layouts do not re-run on client-side navigation between child routes, so every
  // protected page and action must still verify the session itself.
  await requirePageSession();
  return <>{children}</>;
}
