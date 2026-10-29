# Build context: repository root.
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://host/api .
# Screens load their data in the browser, so the build needs no API. NEXT_PUBLIC_API_URL is
# public (it is written into the browser bundle and the CSP), never a secret.
FROM node:24-bookworm-slim AS build
RUN npm install -g pnpm@12.6.0
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter @aml/web...
COPY packages/shared packages/shared
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @aml/web build

# Only the build output: .next/standalone (server.js + traced node_modules) and .next/static.
FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/en/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
