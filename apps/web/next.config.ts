import { fileURLToPath } from "node:url";
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
  // HTTPS only (Nginx and certbot terminate TLS in production; browsers ignore it on http)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Production runs `.next/standalone` in a container (see deploy/). The monorepo root is the
  // tracing root so the shared package and hoisted dependencies are copied in.
  output: "standalone",
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  poweredByHeader: false,
  // Nginx on the host compresses responses.
  compress: false,
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
