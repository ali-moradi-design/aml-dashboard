# Handover notes

Working notes for whoever continues the project (a person or a new Claude session).
Read this first, then `docs/brief.md`, `docs/releases.md`, `docs/decisions.md` and
`docs/tech-decisions.md`.

Last update: 2026-10-17, after release 5 (the planned scope is complete).

## Status

| Release | State | Commit |
| --- | --- | --- |
| 1 Core (login, access model, overview, alerts, transactions) | done | `1f27dce` |
| 2 Forms (customers and KYC, cases, rules; TanStack Table) | done | `6247288` |
| 3 Graph and workflow (network, workflow designer, My work) | done | `f16200d` |
| 4 Completion (news, jobs, import, reports, settings, admin, help, palette) | done | `ce90c2c` (API) + `47770a4` (screens) |
| 5 Remaining languages (de, tr, ar) | done | `009dfdb` |

## How to run

```bash
pnpm install
pnpm db:up                       # Postgres in Docker (user/pass/db: aml)
pnpm --filter @aml/api db:reset  # migrate + seed (about 30 s, ~159k transactions)
pnpm dev                         # web on :3000, API on :4000
```

Demo password for every account: `demo1234`.

| Account | Role | Regions | Clearance |
| --- | --- | --- | --- |
| lena.weber@northbank.example | Analyst | EU | 2 |
| omar.haddad@northbank.example | Supervisor | Gulf, TR | 3 |
| elif.kaya@northbank.example | Compliance manager | all | 4 |
| james.carter@northbank.example | System admin | all | 4 |

Checks: `pnpm -r typecheck`, `pnpm --filter @aml/web lint`, `cd apps/api && npx vitest run`
(33 tests), `pnpm --filter @aml/web build`, and `python scripts/i18n-missing-keys.py . <locale>`
for translations.

## Hard rules (from the brief and the author)

- Public repo: never reference earlier private work or other repositories, and never
  use code or data from earlier employers. All data is fictional.
- The brief rules out showing certain real countries anywhere (data, text, maps).
  High-risk countries are the fictional XA, XB, XC. This is why there is no world map
  in reports.
- Author preferences: pnpm; Tailwind with theme tokens; FSD in `apps/web/src`
  (app, pages, widgets, features, entities, shared); React Query with one request
  function and one hook per API call; next-themes; Express API in layers
  (routes, handlers or inline handle(), services, repositories), factory functions,
  neverthrow results, no classes.
- Look: light theme with the Figma blue palette (00296b, 003f88, 00509d, fdc500,
  ffd500); dark theme graphite with solid #003F88 (no gradients in UI; the logo keeps
  its gradient); plain white 64px app bar; language shown as a short code (EN);
  white collapsible sidebar whose rows do not move; charts must state an insight;
  full width with a max-1600 container.
- Persian text uses correct spelling and full RTL support; time axes of charts stay LTR.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Architecture in one page

- Monorepo: Turborepo + pnpm. `apps/web` (Next.js 16.4 App Router, cacheComponents,
  `proxy.ts` instead of middleware), `apps/api` (Express 5, Prisma 7 with the pg
  adapter, pg-boss, Socket.IO), `packages/shared` (Zod schemas and pure logic used by
  both sides).
- Read `apps/web/AGENTS.md`: this Next.js version differs from older docs; the bundled
  docs are in `node_modules/next/dist/docs`.
- Access model, checked on the server in every query: (1) permission, (2) region of the
  record's branch, (3) clearance rank, (4) case membership for comments and notes.
- Sessions: httpOnly cookie `aml_session`, SHA-256 hashed token, argon2 passwords.
  Disabled users cannot sign in and their sessions end.
- Live updates: Socket.IO rooms `user:{id}`, `role:{ROLE}`, `case:{id}`. Every
  "notification" event is stored first (Notification table, user preferences respected),
  then pushed (`apps/api/src/modules/notifications`, wiring in `apps/api/src/main.ts`).
- Prisma migrations are written with `prisma migrate diff --from-config-datasource
  --to-schema prisma/schema.prisma --script` into a new folder, then
  `prisma migrate deploy` and `prisma generate` (migrate dev does not run
  non-interactively here).
- The seed is deterministic (faker seed 42) and builds: branches with time zones,
  users, ~2,400 customers, ~3,100 accounts with valid IBANs (`ibanFrom` in shared),
  ~159k transactions incl. internal transfers and 14 money-mule rings, ~5.6k alerts,
  90 cases on two workflow versions, jobs with run history, news, notifications,
  import history, audit entries.

## What each release contains (key files)

Release 1: login, overview (KPI cards, insight charts, heatmap in branch local time),
alerts grid and decision, transactions grid with AND/OR advanced search
(`packages/shared/src/criteria.ts`, `apps/api/src/modules/transactions/criteria-to-where.ts`).

Release 2: customer list and profile, onboarding wizard (per-step validation, async
email and IBAN checks, nested field arrays, autosaved drafts, unsaved-changes guard,
server errors mapped to fields), edit KYC, cases (table and board, creation wizard
prefilled from an alert, comments with @mentions, edit history, documents, members,
private notes, live updates), rules (list, detail, rule builder). Tables:
`apps/web/src/shared/ui/data-table.tsx` (TanStack Table v9, server sorting and paging).

Release 3:
- Account network (`/network`): `apps/api/src/modules/network` (WITH RECURSIVE walk,
  shortest path, masking of accounts outside the user's scope),
  `apps/web/src/widgets/network-graph` (Sigma.js 4 + graphology, ForceAtlas2, Louvain).
- Workflow (`/workflow`): shared engine `packages/shared/src/workflow.ts`
  (validation, available actions, SLA), defaults in `workflow-defaults.ts`, API
  `apps/api/src/modules/workflows`, designer `apps/web/src/features/workflow-designer`
  (React Flow), case page diagram `apps/web/src/pages/case-detail/ui/case-workflow.tsx`.
  Versions: draft, published, archived; open cases keep their version.
- My work (`/my-work`): `apps/api/src/modules/my-work`, same engine as the case page.

Release 4:
- API (unit tests in `apps/api/src/modules/completion/completion.test.ts`): notifications
  (`/notifications`), news (`/news`, sanitize-html, uploads, audience filter, read receipts),
  jobs (`/jobs`, pg-boss schedules from the Job table, runners in `apps/api/src/jobs/runners.ts`:
  rule-run, kyc-expiry, sla-check, news-notify), imports (`/imports`, validate then commit),
  reports (`/reports`, Excel export `/reports/export.xlsx`), settings (`/settings`: profile,
  avatar, preferences, password, system settings), admin (`/admin`: users, role permissions,
  branches, clearance names, audit log), search (`/search`). Contracts:
  `packages/shared/src/completion.ts`.
- Entities (one request and one hook per call): `entities/news`, `job`, `import`, `report`,
  `settings` (also `usePreferences`), `admin`, `search`, `notification`.
- Screens: news list, detail (read on open, readers for managers), new and edit
  (`pages/news*`, editor in `features/news-editor`); latest news on the overview
  (`pages/overview/ui/latest-news.tsx`); jobs (`pages/jobs`, schedule dialog with cron presets
  and a browser-side next-runs preview in `features/job-schedule`); import wizard
  (`features/import-wizard`: papaparse / `read-excel-file/browser`, auto-mapping, preview, server
  check with row errors, commit or discard, CSV template); reports (`pages/reports`: Sankey with
  prefixed node ids, 24-hour heatmap, workload bars, funnel, countries table; Excel via
  `download()`, PDF via the print stylesheet in `globals.css`); settings (`pages/settings`,
  sections in the URL `?section=`); admin (`pages/admin`, tabs in the URL `?tab=`); help;
  command palette (`features/command-palette`, cmdk, Ctrl K / ⌘K, the app bar search box opens it).
- Highcharts modules (heatmap, sankey, funnel) are registered once in `shared/ui/chart.tsx`,
  after the core; importing a module before the core breaks at load.
- Preferences applied in the app: digits (`setDigitPreference` in `shared/lib/format.ts`, set
  by `AppLayout`, which waits for `/settings/me` and keys `<main>` on the digit setting),
  density (`data-density` on `<html>`, `.data-cell` rule in `globals.css`), start page (login
  page), quick access (first group in the sidebar and in the palette).
- Every section ships, so the "coming soon" route and page were removed;
  `CURRENT_RELEASE = 4` in `shared/config/navigation.ts`.

Release 5:
- `apps/web/src/shared/i18n/locales/{de,tr,ar}.json` with every key of `en.json`, loaded in
  `shared/i18n/create-i18n.ts`. Arabic has all six plural categories (forms not written by hand
  repeat `_other`, so i18next never falls back to English); many Arabic counts use the
  "label: n" pattern to stay grammatical for every number.
- German was checked on every screen for text that overflows its control (the network period
  labels were shortened to "1 Mon." etc.).
- Content that comes from the database stays as stored: workflow step names (English and
  Persian), news posts, clearance level names, region names from the API in some places.

## Missing translation keys check

`python scripts/i18n-missing-keys.py . <locale>` scans `t("...")` calls in `apps/web/src`
and `app`, plus `errors.*` in `packages/shared`, and lists keys absent from the locale file.
Template keys are reported by prefix; `ruleDescription.${code}` only exists in Persian (the
English text comes from the API). Plural keys (`_one`/`_other`) count as present.

## Post-project tasks

- Graphify: the knowledge graph of the repo is in `graphify-out/` (graph.json, graph.html,
  GRAPH_REPORT.md, labels, manifest are committed; cache, interpreter path, scan root and cost
  are ignored). Rebuild with `/graphify . --update` after larger changes.
- Figma (file in `docs/decisions.md`): not updated yet. On 2026-10-17 the Figma MCP answered
  that the Starter plan's tool-call limit was reached, so no write was possible. Still to do:
  final logo, dark-mode navy interactive colors, the login screen, and frames for the network
  graph, workflow designer, My work and the release 4 screens.

## Remaining ideas (not planned)

- Swap Vazirmatn for the commercial Persian font once its license is bought (see
  `docs/decisions.md`, one CSS variable).
- Workflow step names and transition labels are stored in English and Persian only; German,
  Turkish and Arabic show the English name. A `name.{de,tr,ar}` field in the workflow JSON
  would fix that.
- Playwright tests for RTL layouts and the main flows (planned in tech decisions, not written).
- Print stylesheet keeps the current theme; printing from the dark theme gives dark cards.
- Deployment (Docker Compose, Nginx, GitHub Actions) as described in `docs/tech-decisions.md`.
- `appBar.notificationsSoon` is an unused key from release 1 and can be removed from all
  locale files.

## Known environment quirks

- The browser preview pane in Claude desktop sometimes stops painting (no
  requestAnimationFrame), so WebGL graphs, React Flow and chart animations cannot be
  seen there; check them through the DOM or in a normal browser.
- Stale dev servers can keep ports 3000/4000; check the command line contains
  "aml-dashboard" before stopping them.
- Next's instant-navigation check is limited to opted-in segments
  (`experimental.instantInsights.validationLevel = "manual-warning"`).
- The Turbopack dev server sometimes does not pick up appended CSS in `globals.css`; restart
  `next dev` if a new rule is missing from the served stylesheet. Stopping the web dev server
  that `pnpm dev` started also stops the API; start `pnpm --filter @aml/api dev` again.
- `next build` and `next dev` share `.next`; run the build when no dev page is loading.
