import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LocaleProvider } from "@/context/LocaleProvider";
import { AuthProvider } from "@/context/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WhoSmarter — Live Quiz Show",
  description: "Real-time multiplayer quiz show — who’s smarter?",
  // Quiz content can be in ANY language (it matches the chosen topic), while
  // the page declares lang="en". Mobile Chrome would otherwise auto-translate
  // the "foreign" text and mangle questions, options and player names
  // (e.g. "Нью-Йорк" → "стан-Йорк"). Tell every browser NOT to translate.
  other: { google: "notranslate" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      translate="no"
      className={`notranslate ${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      {/*
        body grows with its content and scrolls normally. The game view
        (GameScreen) pins itself to the viewport with its own
        h-screen/overflow-hidden container, while taller pages like the
        home/create form can scroll on small mobile screens.
      */}
      <body
        className="min-h-dvh bg-[var(--bg-base)] text-[var(--text-primary)]"
        suppressHydrationWarning
      >
        <AuthProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
