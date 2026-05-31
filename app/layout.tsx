import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LocaleProvider } from "@/context/LocaleProvider";
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
  title: "StreamQuiz — Live Quiz Show",
  description: "Real-time two-player quiz show for streamers",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      {/*
        body grows with its content and scrolls normally. The game view
        (GameScreen) pins itself to the viewport with its own
        h-screen/overflow-hidden container, while taller pages like the
        home/create form can scroll on small mobile screens.
      */}
      <body className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
