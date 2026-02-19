import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MenteIQ — Swiss-Made AI Business OS for Service Professionals",
    template: "%s | MenteIQ",
  },
  description:
    "MenteIQ is a Swiss-made AI-native business OS: CRM, invoicing, and knowledge base built for service professionals worldwide. Swiss QR-Bill, GDPR compliant, EU VAT ready.",
  keywords: [
    "CRM", "AI CRM", "Swiss QR-Bill", "GDPR", "EU VAT",
    "Business OS", "Invoicing", "Knowledge Base", "Swiss Made", "MenteIQ",
  ],
  authors: [{ name: "MenteIQ" }],
  creator: "MenteIQ",
  metadataBase: new URL("https://app.menteiq.ch"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: false, // App is gated — do not index authenticated routes
    follow: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://app.menteiq.ch",
    title: "MenteIQ — Swiss-Made AI Business OS for Service Professionals",
    description:
      "Swiss-made AI-native business OS: CRM, invoicing, and knowledge base for service professionals. Swiss QR-Bill, GDPR compliant, EU VAT ready.",
    siteName: "MenteIQ",
    images: [
      {
        url: "/images/landing/hero-dashboard.webp",
        width: 1024,
        height: 1024,
        alt: "MenteIQ Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MenteIQ — Swiss-Made AI Business OS",
    description:
      "Swiss-made AI business OS for service professionals. Swiss QR-Bill, GDPR, EU VAT ready.",
    images: ["/images/landing/hero-dashboard.webp"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCProvider>{children}</TRPCProvider>
        <CookieConsentBanner />
      </body>
    </html>
  );
}

