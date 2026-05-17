import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import CodeRain from "@/components/CodeRain";
import { RealtimeProvider } from "@/lib/realtimeClient";
import AchievementToast from "@/components/AchievementToast";
import ChatDock from "@/components/ChatDock";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bugrush — Speed Fix",
  description: "A competitive debugging game. Patch broken code under pressure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pressStart.variable} h-full antialiased`}
    >
      <body className="h-full antialiased bg-zinc-950 bg-grid text-zinc-100">
        <CodeRain />
        <RealtimeProvider>
          {children}
          <ChatDock />
          <AchievementToast />
        </RealtimeProvider>
      </body>
    </html>
  );
}
