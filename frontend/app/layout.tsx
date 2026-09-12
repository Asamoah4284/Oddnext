import type { Metadata } from "next";
import { Big_Shoulders, IBM_Plex_Mono, Manrope } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { BRAND_NAME, SITE_URL } from "@/lib/api";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

const display = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} | Daily Football Tips for Ghana & Nigeria`,
    template: `%s | ${BRAND_NAME}`,
  },
  description:
    "Football tips for Ghana and Nigeria: 10 odds from GHS 30, VIP all-access GHS 1500, SportyBet booking codes, and Telegram.",
  openGraph: {
    title: `${BRAND_NAME} daily football tips`,
    description:
      "Pay a board from GHS 30, or GHS 1500 VIP for every slip and SportyBet codes. No free board.",
    url: SITE_URL,
    siteName: BRAND_NAME,
    locale: "en_GH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} daily football tips`,
    description: "Priced odds boards and GHS 1500 VIP for Ghana and Nigeria. No free board.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} ${mono.variable} font-sans`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
