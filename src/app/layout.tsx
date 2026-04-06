import "@/styles/globals.css";

import { type Metadata } from "next";
import { Work_Sans } from "next/font/google";

export const metadata: Metadata = {
  title: "Shri — Marketplace marocain",
  description: "Créez et gérez votre boutique en ligne.",
};

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${workSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
