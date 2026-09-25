import type { Metadata } from "next";
import localFont from "next/font/local";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import "./globals.css";

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: { default: "Skylar", template: "%s · Skylar" },
  description: "Skylar HR Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={geistMono.variable}>
        <TopProgressBar />
        {children}
      </body>
    </html>
  );
}
