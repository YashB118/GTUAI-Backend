import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
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
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-bg-primary text-text-primary`}>
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
