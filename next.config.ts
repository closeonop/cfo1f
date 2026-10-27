import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  async rewrites() {
    // Keep browser API calls same-origin so the backend's SameSite=Strict
    // refresh cookie works on Vercel. API_INTERNAL_URL must end with /api.
    const apiBase = process.env.API_INTERNAL_URL;
    return apiBase ? [{ source: "/_backend/:path*", destination: `${apiBase.replace(/\/$/, "")}/:path*` }] : [];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    }];
  },
};

export default nextConfig;
