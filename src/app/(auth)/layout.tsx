export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main className="skylar-page-content min-h-dvh bg-ink text-paper">{children}</main>;
}
