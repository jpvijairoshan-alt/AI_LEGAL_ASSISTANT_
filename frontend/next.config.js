/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },
  experimental: {
    // The AI chat call (LLM) can take longer than the default 30s proxy timeout.
    proxyTimeout: 120000,
  },
  async rewrites() {
    return [
      {
        // Server-side only: BACKEND_URL is never exposed to the browser.
        source: "/api/backend/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
