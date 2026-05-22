import type { NextConfig } from "next";

// Monaco loads its loader + workers from jsDelivr by default.
const MONACO_CDN = "https://cdn.jsdelivr.net";

const csp = [
  "default-src 'self'",
  `img-src 'self' data: https://*.public.blob.vercel-storage.com https://lh3.googleusercontent.com`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${MONACO_CDN}`,
  `script-src-elem 'self' 'unsafe-inline' ${MONACO_CDN}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${MONACO_CDN}`,
  `style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com ${MONACO_CDN}`,
  `font-src 'self' data: https://fonts.gstatic.com ${MONACO_CDN}`,
  `connect-src 'self' https://*.upstash.io https://*.public.blob.vercel-storage.com ${MONACO_CDN}`,
  `worker-src 'self' blob: ${MONACO_CDN}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
