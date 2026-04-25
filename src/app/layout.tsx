import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intellectual Kinetic",
  description: "Server-side Next.js monolith scaffold for Intellectual Kinetic.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
