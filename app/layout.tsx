import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import BottomNav, { NavSpacer } from "@/components/BottomNav";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Safer — Plan a trip your whole group agrees on",
  description: "Plan a trip your whole group agrees on, where everything just works.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="flex flex-col min-h-dvh">
        {children}
        {/* NavSpacer pushes page content above the fixed nav */}
        <NavSpacer />
        <BottomNav />
      </body>
    </html>
  );
}
