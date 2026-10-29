# Build context: repository root.  docker build -f apps/api/Dockerfile .
# The final image holds only the bundled code (dist: API and seed), the Prisma schema,
# migrations and config, and the production dependencies: no source code, no dev dependencies.
# Prisma's migration engine needs OpenSSL
FROM node:24-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build
RUN npm install -g pnpm@12.6.0
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter @aml/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
# the generated Prisma client is TypeScript source, bundled into dist by tsup
RUN pnpm --filter @aml/api db:generate \
  && pnpm --filter @aml/api build \
  && pnpm --filter @aml/api deploy --prod --legacy /out

FROM base
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/api/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=build --chown=node:node /repo/apps/api/prisma/migrations ./prisma/migrations
COPY --from=build --chown=node:node /repo/apps/api/prisma.config.ts ./prisma.config.ts
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
# uploads (a volume in production) are the only writable folder
RUN mkdir -p storage && chown node:node storage
USER node

EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# apply pending migrations, then start
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
