import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Image optimization */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.imgbb.com" },
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
    ],
    minimumCacheTTL: 31536000,
    formats: ["image/avif", "image/webp"],
  },

  compress: true,

  /* Turbopack root - silences lockfile warning */
  turbopack: {
    root: __dirname,
  },

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/pictures/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/public/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/",
        destination: "/shop",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
