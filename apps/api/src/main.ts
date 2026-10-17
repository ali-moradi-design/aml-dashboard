import { createServer } from "node:http";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { createDb } from "./db/prisma";
import { createScheduler } from "./jobs/scheduler";
import { createAlertsModule } from "./modules/alerts";
import { createAuthModule } from "./modules/auth";
import { createHealthModule } from "./modules/health";
import { createOverviewModule } from "./modules/overview";
import { createReferenceModule } from "./modules/reference";
import { createTransactionsModule } from "./modules/transactions";
import { createRealtime } from "./realtime/socket";

// Composition root: the only place that creates real dependencies and connects the pieces.
const env = loadEnv();
const db = createDb(env.DATABASE_URL);
const auth = createAuthModule({ db, secureCookies: env.NODE_ENV === "production" });
const deps = { db, requireAuth: auth.requireAuth };

const app = createApp({
  webOrigin: env.WEB_ORIGIN,
  routes: {
    "/health": createHealthModule({ db }),
    "/auth": auth.router,
    "/reference": createReferenceModule(deps),
    "/overview": createOverviewModule(deps),
    "/alerts": createAlertsModule(deps),
    "/transactions": createTransactionsModule(deps),
  },
});

const server = createServer(app);
const io = createRealtime(server, env.WEB_ORIGIN);
const scheduler = createScheduler(env.DATABASE_URL);

server.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

// The API still serves requests without the scheduler (for example while Postgres is starting).
void scheduler.start().match(
  () => console.log("[jobs] scheduler started"),
  (error) => console.warn(`[jobs] ${error.message}`),
);

const shutdown = async () => {
  await scheduler.stop();
  await io.close();
  await db.$disconnect();
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
