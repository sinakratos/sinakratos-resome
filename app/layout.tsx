import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sina Khoshzaban | Backend Developer",
  description: "Backend developer specializing in Node.js, NestJS, scalable APIs, and clean architecture.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
