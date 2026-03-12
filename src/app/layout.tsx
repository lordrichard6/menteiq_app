import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";

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
  // Default: allow public pages (login, signup, privacy, terms) to be indexed.
  // Authenticated routes override this in the admin layout with index:false.
  robots: {
    index: true,
    follow: true,
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
        width: 1200,
        height: 630,
        alt: "MenteIQ — Swiss-Made AI Business OS Dashboard",
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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192x192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Structured data — SoftwareApplication + Organization (schema.org) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'MenteIQ',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                url: 'https://app.menteiq.ch',
                description:
                  'Swiss-made AI-native business OS: CRM, invoicing, and knowledge base for service professionals. Swiss QR-Bill, GDPR compliant, EU VAT ready.',
                offers: [
                  {
                    '@type': 'Offer',
                    name: 'Free',
                    price: '0',
                    priceCurrency: 'CHF',
                    description: 'Free tier with core CRM features',
                  },
                  {
                    '@type': 'Offer',
                    name: 'Pro',
                    price: '29',
                    priceCurrency: 'CHF',
                    description: 'Full AI features, invoicing, and knowledge base',
                  },
                ],
                featureList: [
                  'AI Chat (OpenAI, Claude, Gemini)',
                  'Swiss QR-Bill Generation',
                  'Contact CRM & Pipeline',
                  'Project & Task Management',
                  'Time Tracking',
                  'RAG Knowledge Base',
                  'Client Portal',
                  'GDPR Compliant',
                  'EU VAT Ready',
                ],
              },
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'MenteIQ',
                url: 'https://menteiq.ch',
                logo: 'https://app.menteiq.ch/menteiq_logo.svg',
                contactPoint: {
                  '@type': 'ContactPoint',
                  contactType: 'customer support',
                  email: 'support@menteiq.ch',
                },
                areaServed: ['CH', 'EU'],
              },
            ]),
          }}
        />

        {/* Skip-to-main-content link for keyboard/screen-reader users (WCAG 2.1 SC 2.4.1) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-gray-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="menteiq-theme"
        >
          <TRPCProvider>{children}</TRPCProvider>
          <CookieConsentBanner />
          <Analytics />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}

