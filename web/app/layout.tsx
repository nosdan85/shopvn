import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", /* Prevents FOIT (flash of invisible text) */
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nosdan.store";
const SOCIAL_BANNER_IMAGE = "/pictures/banner.jpg";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#050505",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "NOS Market | Premium Gaming Marketplace",
  description: "Buy and sell gaming items securely with instant delivery. Premium dark tech gaming marketplace.",
  keywords: ["gaming", "marketplace", "roblox", "game items", "buy sell"],
  authors: [{ name: "NOS Market" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NOS Market | Premium Gaming Marketplace",
    description: "Buy and sell gaming items securely with instant delivery.",
    url: "/",
    siteName: "NOS Market",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: SOCIAL_BANNER_IMAGE,
        width: 2048,
        height: 702,
        alt: "NOS Market banner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NOS Market | Premium Gaming Marketplace",
    description: "Buy and sell gaming items securely with instant delivery.",
    images: [SOCIAL_BANNER_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://cdn.discordapp.com" />
        <link rel="preconnect" href="https://i.ibb.co" />
        <meta name="theme-color" content="#050505" />
      </head>
      <body className="min-h-full flex flex-col bg-[#050505] text-white">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
