# AML Monitor

Transaction monitoring and anti-money laundering dashboard for a fictional
international bank. Portfolio project: all data is generated.

- Brief: [docs/brief.md](docs/brief.md)
- Release plan: [docs/releases.md](docs/releases.md)
- Design decisions: [docs/decisions.md](docs/decisions.md)
- Technical decisions: [docs/tech-decisions.md](docs/tech-decisions.md)

## Structure

```
apps/web         Next.js frontend (Tailwind, FSD, React Query, i18next, next-themes)
apps/api         Express backend (layered, functional, neverthrow, Prisma, pg-boss, Socket.IO)
packages/shared  Zod schemas and types used by both apps
```

## Run locally

Requirements: Node 24, pnpm 12, Docker.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up                                   # Postgres in Docker
pnpm --filter @aml/api exec prisma migrate deploy
pnpm --filter @aml/api db:seed               # ~150K fictional transactions, ~5K alerts
pnpm dev                                     # web on :3000, api on :4000
```

Other commands: `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm format`.

### Demo accounts

All demo accounts use the password `demo1234` (fictional people, generated data). The login
page also has one-click buttons for them.

| Role | Email | Regions | Clearance |
| --- | --- | --- | --- |
| Analyst | lena.weber@northbank.example | Europe | 2 |
| Supervisor | omar.haddad@northbank.example | Gulf, Türkiye | 3 |
| Compliance manager | elif.kaya@northbank.example | all | 4 |
| System admin | james.carter@northbank.example | all | 4 |

Each account sees only the alerts and transactions of its regions and clearance level; the
API enforces this on every request.

## Release status

- [x] Release 1: login and sessions, layered access model, overview with insight charts,
  alerts grid and alert decision, transactions grid with AND/OR advanced search,
  light/dark theme, English and Persian (RTL)
- [x] Release 2: customers with KYC profile and a multi-step onboarding form, cases
  (table and board views, a creation wizard prefilled from an alert, four-eyes approval chain,
  threaded comments with @mentions and edit history, documents, private notes, live updates
  over Socket.IO), detection rules with performance stats and an AND/OR rule builder
- [x] Release 3: account network graph (Sigma.js, ForceAtlas2 layout, Louvain clusters,
  recursive SQL for neighbors and shortest paths, masked accounts outside the user's access),
  case workflow designer (React Flow, live validation, versioning: open cases keep their
  version) with a server-side engine that drives the case page and the new My work inbox
- [x] Release 4: reports (Sankey money flows, alert heatmap, workload, review funnel,
  country table; Excel export and print-to-PDF), scheduled jobs (pg-boss, cron presets with a
  next-runs preview, run history), data import wizard (CSV/Excel, column mapping, server
  validation with row errors), news with a rich-text editor and read receipts, live
  notification center, settings (profile photo, digits, table density, start page, quick
  access, notification types, password and sessions), admin (users, role permission matrix,
  branches, clearance names, audit log), help page and a Ctrl K command palette
- [x] Release 5: German, Turkish and Arabic (RTL) for every screen, so all five languages
  (English, German, Turkish, Arabic, Persian) are complete; German text checked against the layout

## Licenses of third-party parts

- Fonts (Huninn, Vazirmatn, Geist Mono): SIL Open Font License, files and
  licenses in `apps/web/src/shared/assets/fonts`.
- Highcharts is used under its non-commercial terms. Tables are built on
  TanStack Table (MIT), so there is no grid license or watermark.
