import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";

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
    default: "OrbitCRM — AI-Powered CRM for European Service Professionals",
    template: "%s | OrbitCRM",
  },
  description:
    "OrbitCRM is an AI-native CRM, invoicing, and knowledge base built for European service professionals. Swiss QR-Bill, GDPR compliant, EU VAT ready.",
  keywords: [
    "CRM", "AI CRM", "Swiss QR-Bill", "GDPR", "EU VAT",
    "Business OS", "Invoicing", "Knowledge Base", "European CRM",
  ],
  authors: [{ name: "OrbitCRM" }],
  creator: "OrbitCRM",
  metadataBase: new URL("https://app.orbitcrm.com"),
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
    url: "https://app.orbitcrm.com",
    title: "OrbitCRM — AI-Powered CRM for European Service Professionals",
    description:
      "AI-native CRM, invoicing, and knowledge base for European service professionals. Swiss QR-Bill, GDPR compliant, EU VAT ready.",
    siteName: "OrbitCRM",
    images: [
      {
        url: "/images/landing/hero-dashboard.webp",
        width: 1024,
        height: 1024,
        alt: "OrbitCRM Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OrbitCRM — AI-Powered CRM",
    description:
      "AI-native CRM for European service professionals. Swiss QR-Bill, GDPR, EU VAT ready.",
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
      </body>
    </html>
  );
}

