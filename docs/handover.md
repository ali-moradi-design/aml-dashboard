# Handover notes

Working notes for whoever continues the project (a person or a new Claude session).
Read this first, then `docs/brief.md`, `docs/releases.md`, `docs/decisions.md` and
`docs/tech-decisions.md`.

Last update: 2026-10-17, during release 4.

## Status

| Release | State | Commit |
| --- | --- | --- |
| 1 Core (login, access model, overview, alerts, transactions) | done | `1f27dce` |
| 2 Forms (customers and KYC, cases, rules; TanStack Table) | done | `6247288` |
| 3 Graph and workflow (network, workflow designer, My work) | done | `f16200d` |
| 4 Completion | in progress (API done, screens partly done) | see below |
| 5 Remaining languages (de, tr, ar) | not started | |

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
(33 tests), `pnpm --filter @aml/web build`.

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

Release 4 (in progress):
- Done, API side (all tested with curl, unit tests in
  `apps/api/src/modules/completion/completion.test.ts`):
  notifications (`/notifications`), news (`/news`, sanitize-html, uploads, audience
  filter, read receipts), jobs (`/jobs`, pg-boss schedules from the Job table, runners in
  `apps/api/src/jobs/runners.ts`: rule-run, kyc-expiry, sla-check, news-notify),
  imports (`/imports`, validate then commit), reports (`/reports`, Excel export
  `/reports/export.xlsx`), settings (`/settings`: profile, avatar, preferences, password,
  system settings), admin (`/admin`: users, role permissions, branches, clearance names,
  audit log), search (`/search`, for the command palette).
- Shared contracts: `packages/shared/src/completion.ts`.
- Done, web side: notification bell in the app bar (live), notification center page
  (`/notifications`), news entity, news editor feature (TipTap, cover crop with
  `shared/ui/image-crop-dialog.tsx`, attachments, audience, schedule), upload and
  download helpers in `shared/api/http.ts`.
- Fixed on the way: the overview heatmap converted time zones the wrong way
  (timestamps are UTC without zone; now `(x AT TIME ZONE 'UTC') AT TIME ZONE tz`).

## Remaining work

Release 4 screens (APIs exist):
1. News pages: list (`/news`, cards, pinned first, state badges and read counts for
   managers), detail (`/news/[id]`, render the sanitized HTML with a `.news-body` style
   in globals.css, mark read on open, readers list for managers), new and edit routes
   using `NewsEditor`. Latest news widget on the overview page.
2. Jobs page (`/jobs`): cards with next run, last run, success rate, duration
   sparkline; edit dialog with cron presets and a next-runs preview (cron-parser in the
   browser); "Run now"; run history.
3. Import page (`/import`): wizard (choose kind and file, parse CSV with papaparse or
   Excel with `read-excel-file/browser` `readSheet`, map columns with auto-match,
   preview, server validation with row errors, commit), template download, history.
4. Reports page (`/reports`): range presets; Sankey (highcharts/modules/sankey; prefix
   node ids so branch and counterparty countries differ), heatmap, workload bars,
   funnel (highcharts/modules/funnel), countries table; Excel export via `download()`;
   PDF through a print stylesheet.
5. Settings page (`/settings`): profile with avatar crop (round), appearance (digits,
   density, start page, language, theme), notification types, quick access (max 6),
   security (password, sessions via existing `/auth/sessions`), system (admin only).
   Apply preferences in the app (digits in `shared/lib/format.ts`, density for tables,
   start page after login, quick access in the sidebar).
6. Admin page (`/admin`): users (table and form with `userInputSchema`), role and
   permission matrix, regions and branches, clearance names, audit log (DataTable,
   `POST /admin/audit`).
7. Help page (`/help`): short guide and keyboard shortcuts.
8. Command palette (cmdk) on Ctrl K in the app layout: pages, actions (new case, new
   customer), search results from `/search`, quick access first.
9. Set `CURRENT_RELEASE = 4` in `apps/web/src/shared/config/navigation.ts` once the
   pages exist; add routes for every new page under `app/[locale]/(app)`.
10. Translations: run the missing-keys check (see below) and add en and fa keys for
    notifications, news, newsEditor, crop, jobs, import, reports, settings, admin,
    help, palette, errors (stepId, passwordWrong, passwordMatch, passwordSame,
    passwordLetters, passwordDigits, cron, branchCode, branchCodeTaken, oneRegion,
    oneCountry, unknownAccount, customerType, country, currency, direction, channel,
    date, invalid, noRows, tooManyRows, newsBody, expiryAfterPublish, min3).
    `notifications.text.<type>` uses the data fields (code, by, step, title, job,
    count, file).
11. Verify in the browser (light, dark, Persian), build, update README release status,
    commit "Release 4".

Release 5: German, Turkish and Arabic text for every key in `en.json`; check German
length against the layout; Arabic uses RTL like Persian; Highcharts and Intl already
follow the locale.

After the project: run graphify on the repo (`/graphify`), update Figma (final logo,
dark-mode navy interactive colors, the login screen, then screens of the new releases;
the Figma connector needs to be authorized again), and refresh these notes.

## Missing translation keys check

`missing_keys.py` lived in the old session's scratchpad. It scans `t("...")` calls in
`apps/web/src` and `app`, plus `errors.*` in `packages/shared/src/forms.ts`, and lists
keys absent from `en.json`. Plural keys (`_one`/`_other`) show up as false positives.
Rewrite it if needed; it is 30 lines of Python.

## Known environment quirks

- The browser preview pane in Claude desktop sometimes stops painting (no
  requestAnimationFrame), so WebGL graphs, React Flow and chart animations cannot be
  seen there; check them through the DOM or in a normal browser.
- Stale dev servers can keep ports 3000/4000; check the command line contains
  "aml-dashboard" before stopping them.
- Next's instant-navigation check is limited to opted-in segments
  (`experimental.instantInsights.validationLevel = "manual-warning"`).
