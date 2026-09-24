import type { Metadata, Viewport } from "next";
import { Fredoka, Plus_Jakarta_Sans } from "next/font/google";

import BreakTimer from "./_components/BreakTimer";
import "./globals.css";

// Fredoka carries the voice: rounded like the logo's lettering, but used
// only for display sizes so the page never tips into "toy". Plus Jakarta Sans
// does the reading, the same face the main ShowTiva app reads in, which is
// what makes the two feel like one family.
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ShowTiva Kids", template: "%s · ShowTiva Kids" },
  description:
    "Hand-picked cartoons, songs and stories for kids, starring Bloop, Kai, Cog, Nova, Zip and Coco. Profiles by age, a break timer and zero ads.",
  applicationName: "ShowTiva Kids",
};

export const viewport: Viewport = {
  themeColor: "#fff8ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${jakarta.variable}`}>
      <body className="font-sans">
        {children}
        <BreakTimer />
      </body>
    </html>
  );
}
