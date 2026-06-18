import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: 'Audio Films — Blind Listening Trainer',
  description: 'Practice phrase-based listening with YouTube captions.',
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
