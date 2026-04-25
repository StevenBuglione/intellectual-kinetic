import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intellectual Kinetic",
  description:
    "AST-first book restoration workspace with Tiptap editing and deterministic LaTeX preview.",
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
