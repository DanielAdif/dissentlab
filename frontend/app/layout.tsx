import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({
  subsets: ["latin"],
  style: ["italic"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "DissentLab",
  description: "AI council research and debate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${lora.variable}`}>
      <head>
        {/* Runs before paint: applies user's saved theme, preventing flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="flex h-screen overflow-hidden">
        <Providers>
          <Sidebar />
          <div className="flex-1 h-screen overflow-y-auto">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
