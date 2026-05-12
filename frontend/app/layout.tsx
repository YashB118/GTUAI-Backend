import type { Metadata } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Nunito — rounded, friendly, closest to Discord's gg sans
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter", // keep same var name so all existing classes still work
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "GTU ExamAI — Smart Exam Predictions",
  description: "AI-powered exam predictions and study materials for GTU students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light');}catch(e){}})();`,
          }}
        />
        {/* Mermaid.js — browser-side diagram rendering (free, unlimited) */}
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `
              import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
              window.mermaid = mermaid;
              mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
            `,
          }}
        />
      </head>
      <body className={`${nunito.variable} ${jetbrainsMono.variable} font-sans antialiased bg-bg-primary text-text-primary`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgb(17 17 27)",
              border: "1px solid rgb(40 40 56 / 0.8)",
              color: "rgb(242 242 247)",
              fontSize: "13px",
              borderRadius: "12px",
            },
            classNames: {
              success: "!border-emerald-500/30",
              error:   "!border-red-500/30",
              info:    "!border-accent/30",
            },
          }}
        />
      </body>
    </html>
  );
}
