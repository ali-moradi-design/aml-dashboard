import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
