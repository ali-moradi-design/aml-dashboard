import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").origin;
const apiSocket = api.replace(/^http/, "ws");

/**
 * Content Security Policy: the browser only loads scripts, styles, images and connections from
 * the sources listed here, so injected markup cannot pull in or send data to other sites.
 * Inline scripts stay allowed because nonces need fully dynamic rendering (no partial
 * prerendering); the HTML sanitizer on news posts is the first line against script injection.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${api}`,
  "font-src 'self' data:",
  `connect-src 'self' ${api} ${apiSocket}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Screens sit behind login and load their data in the browser through React Query, so they
    // cannot be instant by design. Only segments that opt in with `export const instant` are validated.
    instantInsights: { validationLevel: "manual-warning" },
  },
  // Shared Zod schemas are published as TypeScript source.
  transpilePackages: ["@aml/shared"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
