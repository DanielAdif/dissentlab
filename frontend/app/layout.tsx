import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "DissentLab",
  description: "AI council research and debate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <nav className="border-b border-border px-4 py-3 flex gap-6">
          <Link href="/" className="text-sm text-foreground hover:text-accent">Home</Link>
          <Link href="/history" className="text-sm text-muted hover:text-foreground">History</Link>
          <Link href="/settings/models" className="text-sm text-muted hover:text-foreground">Models</Link>
          <Link href="/settings/personas" className="text-sm text-muted hover:text-foreground">Personas</Link>
        </nav>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
