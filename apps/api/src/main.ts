import { createServer } from "node:http";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { createDb } from "./db/prisma";
import { createScheduler } from "./jobs/scheduler";
import { createAlertsModule } from "./modules/alerts";
import { createAuthModule } from "./modules/auth";
import { createCasesModule, type Notifier } from "./modules/cases";
import { createCasesRepository } from "./modules/cases/cases.repository";
import { createCasesService } from "./modules/cases/cases.service";
import { createCustomersModule } from "./modules/customers";
import { createDraftsModule } from "./modules/drafts";
import { createHealthModule } from "./modules/health";
import { createMyWorkModule } from "./modules/my-work";
import { createNetworkModule } from "./modules/network";
import { createOverviewModule } from "./modules/overview";
import { createReferenceModule } from "./modules/reference";
import { createRulesModule } from "./modules/rules";
import { createTransactionsModule } from "./modules/transactions";
import { createWorkflowsModule } from "./modules/workflows";
import { createRealtime } from "./realtime/socket";

// Composition root: the only place that creates real dependencies and connects the pieces.
const env = loadEnv();
const db = createDb(env.DATABASE_URL);
const auth = createAuthModule({ db, secureCookies: env.NODE_ENV === "production" });
const deps = { db, requireAuth: auth.requireAuth };

// Modules publish live updates through this notifier; Socket.IO is attached once the server exists.
const silent: Notifier = { toCase: () => {}, toUser: () => {}, toRole: () => {} };
let live: Notifier = silent;
const notify: Notifier = {
  toCase: (...a) => live.toCase(...a),
  toUser: (...a) => live.toUser(...a),
  toRole: (...a) => live.toRole(...a),
};

const app = createApp({
  webOrigin: env.WEB_ORIGIN,
  routes: {
    "/health": createHealthModule({ db }),
    "/auth": auth.router,
    "/reference": createReferenceModule(deps),
    "/overview": createOverviewModule(deps),
    "/alerts": createAlertsModule(deps),
    "/transactions": createTransactionsModule(deps),
    "/customers": createCustomersModule(deps),
    "/network": createNetworkModule(deps),
    "/cases": createCasesModule({ ...deps, notify, storageDir: env.STORAGE_DIR }),
    "/rules": createRulesModule(deps),
    "/drafts": createDraftsModule(deps),
    "/workflows": createWorkflowsModule(deps),
    "/my-work": createMyWorkModule(deps),
  },
});

const server = createServer(app);
const cases = createCasesService({ repo: createCasesRepository(db), notify });
const realtime = createRealtime(server, {
  webOrigin: env.WEB_ORIGIN,
  authenticate: async (token) => (await auth.service.authenticate(token)).unwrapOr(null),
  canJoinCase: async (p, code) => (await cases.caseId(p, code)).map((c) => (c.isMember ? c.id : null)).unwrapOr(null),
});
live = realtime.notifier;
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
  await realtime.io.close();
  await db.$disconnect();
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
