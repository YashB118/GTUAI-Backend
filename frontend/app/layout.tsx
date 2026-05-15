import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Inter — clean, modern sans-serif (matches reference image)
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
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
        {/* Light theme default — dark is opt-in via .dark class */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        {/* Mermaid.js for diagrams */}
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `
              import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
              window.mermaid = mermaid;
              mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-bg-page text-text-primary`}>
        {children}
        <Toaster
          position="bottom-right"
          theme="system"
          toastOptions={{
            style: {
              fontSize: "13px",
              borderRadius: "14px",
            },
            classNames: {
              toast:   "!bg-bg-card !text-text-primary !border-border !shadow-card",
              success: "!border-l-4 !border-l-emerald-500",
              error:   "!border-l-4 !border-l-red-500",
              info:    "!border-l-4 !border-l-blue-500",
              warning: "!border-l-4 !border-l-amber-500",
            },
          }}
        />
      </body>
    </html>
  );
}
