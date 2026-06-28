import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";

const dmSans = localFont({
  src: [
    { path: "../public/fonts/dm-sans-latin-wght-normal.woff2", style: "normal", weight: "100 700" },
    { path: "../public/fonts/dm-sans-latin-wght-italic.woff2", style: "italic", weight: "100 700" },
  ],
  variable: "--font-dm-sans",
  display: "swap",
});

const playfair = localFont({
  src: [
    { path: "../public/fonts/playfair-display-latin-wght-normal.woff2", style: "normal", weight: "400 700" },
    { path: "../public/fonts/playfair-display-latin-wght-italic.woff2", style: "italic", weight: "400 700" },
  ],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DissentLab",
  description: "AI council research and debate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies saved theme before paint; defaults to light */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="flex flex-col h-screen overflow-hidden">
        <Providers>
          <Sidebar />
          <div className="flex-1 min-h-0 relative overflow-y-auto">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
