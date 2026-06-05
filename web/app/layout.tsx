import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "./providers";
import ErrorBoundary from "./components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
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
  themeColor: "#071326",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "NOS Market | Chợ Game Uy Tín",
  description: "Mua bán vật phẩm game an toàn với giao hàng tức thì. Chợ game uy tín hàng đầu Việt Nam.",
  keywords: ["game", "chợ game", "roblox", "vật phẩm game", "mua bán game"],
  authors: [{ name: "NOS Market" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NOS Market | Chợ Game Uy Tín",
    description: "Mua bán vật phẩm game an toàn với giao hàng tức thì.",
    url: "/",
    siteName: "NOS Market",
    type: "website",
    locale: "vi_VN",
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
    title: "NOS Market | Chợ Game Uy Tín",
    description: "Mua bán vật phẩm game an toàn với giao hàng tức thì.",
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
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://cdn.discordapp.com" />
        <link rel="preconnect" href="https://i.ibb.co" />
        <meta name="theme-color" content="#071326" />
      </head>
      <body className="min-h-full flex flex-col bg-[#071326] text-white relative">
        {/* Glow orbs for Apple Liquid Glass effect */}
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
        <div className="glow-orb glow-orb-3" />
        <ClientProviders>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ClientProviders>
      </body>
    </html>
  );
}
