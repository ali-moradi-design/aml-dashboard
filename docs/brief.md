# AML dashboard: brief

Decisions from 2026-10-16. This is demo 1 in notes/demos.md (the admin dashboard).
The build happens in its own public repo and its own sessions; this file is the
handoff for that work.

## Topic

Transaction monitoring and anti-money laundering (AML) for a fictional
international bank.

One-sentence pitch: the bank checks transactions against rules, suspicious ones
become alerts, analysts review them, and serious ones become cases and reports.

### Domain basics (for the user, who is new to AML)

- Money laundering has three stages: placement (cash into the bank in small
  pieces), layering (moving money through many accounts and countries to hide its
  origin), integration (buying assets so the money looks legal).
- Banks must: know the customer (KYC: identity, job, normal income), monitor
  transactions with rules, and report suspicious activity (SAR) to the regulator.
- Example rules: structuring (several deposits just under the reporting limit in
  one day), rapid in-and-out (money leaves the account a day after it arrives),
  sudden change of behavior, dormant account becomes active, transfers to
  high-risk countries, repeated round amounts.
- Most alerts are false positives; reviewing them is the analyst's daily work.

### Workflow

1. Compliance manager defines rules with the AND/OR rule builder.
2. Scheduled jobs (cron) run the rules.
3. Matching transactions create alerts.
4. Analyst reviews an alert: close as false positive, or escalate to a case.
5. A case groups related alerts, parties, documents and notes.
6. Supervisor approves; the case is reported (SAR) or closed.

Roles: analyst, supervisor, compliance manager, system admin.

## Originality

- No code or data from earlier employers. Everything is written from scratch.

## Content and locale rules

- No mention of Iran anywhere (data, text, maps). The high-risk country list is
  fictional or generic, to avoid political sensitivity.
- Fictional bank with branches in cities such as Berlin, Istanbul, Dubai, London.
- Multi-currency (EUR, USD, TRY, AED) with a base currency amount on every
  transaction. Fictional international names; no real data.
- Five languages: English (default), German, Turkish, Arabic, Persian. Locale in
  the URL (`/en`, `/de`, ...). Arabic and Persian are RTL (`dir="rtl"` on `html`).
- Use logical CSS only (`ms-*`, `me-*`, `text-start`), never left/right.
  Directional icons mirror in RTL. Chart time axes, account numbers, IBANs and
  amounts stay LTR.
- AG Grid: `enableRtl` and its official locale packs (verify the languages).
- Fonts: Vazirmatn for Arabic and Persian, a separate Latin font.
- German text is ~30% longer: no fixed-width buttons or columns; test in Figma.
- Numbers, dates and money through `Intl`. Arabic and Persian show native digits
  by default with a user setting to switch to Latin digits. Gregorian calendar for
  every language.

## Global UI

- Sidebar built from permissions.
- Quick access: user pins pages, saved searches and cases, reorders by drag;
  command palette (`Ctrl+K`) to jump to any page, customer or case.
- Notifications: bell with unread count, live updates (case assigned, critical
  alert, failed job run, mention, news).

## Pages

1. Login with ready-made demo accounts per role.
2. Overview: KPI cards, alert trend, review funnel, branch map, news widget;
   different per role.
3. Alerts: large grid (filter, group); alert detail (transaction, rule that fired,
   customer history, decision).
4. Cases: grid and status-column views; case page with multi-step form, related
   parties, documents, comments, timeline, approval.
5. Transactions: grid with hundreds of thousands of rows, AND/OR advanced search,
   saved searches, filter by drawing an area on the map.
6. Customers: list; profile with KYC form, risk score gauge, accounts, transactions.
7. Account network graph in the Neo4j Bloom style (force-directed): customers,
   accounts, companies as nodes; transfers and ownership as edges. Double-click
   expands neighbors, node color = risk, edge width = amount, time-range filter,
   path between two accounts, highlighted clusters. Library: Sigma.js (WebGL, MIT)
   rather than React Flow (React Flow stays for the workflow designer). Not
   Neo4j's NVL (non-standard license) and no Neo4j database (Postgres recursive
   queries are enough for 2-3 hops; a JVM database is too heavy for the 6 GB VPS).
8. Rules: list, rule builder, per-rule performance (share of true alerts).
9. Scheduled jobs: cron form with next-run preview, run history, run results.
10. Data import: upload CSV/Excel, map columns to fields, preview, row errors,
    import history.
11. Reports: Sankey (money flow between countries), heatmap (alerts by weekday and
    hour), world transfer map, analyst workload, review funnel; Excel/PDF export.
12. Admin: users, roles and permissions, regions and branches, clearance levels,
    audit log.
13. News: create and manage (see below).
14. My work (inbox): see below.
15. Notification center: full list, filters, mark all read.
16. Settings: profile (name, photo with crop); appearance and language (language,
    light/dark, digit style, grid density, start page); notification preferences;
    quick access; security (password, active sessions); system settings for admins
    (base currency, high-risk country list).

## News

- Rich text editor, cover image with crop, attachments.
- Audience: chosen roles, regions or clearance levels; only they see it.
- Publish time and expiry time; pin important news.
- Shown in the overview widget and as a notification; the author sees who read it.
- Creating news is its own permission (`news.create`).

## My work (inbox)

- Alerts assigned to me, cases waiting for my approval, mentions.
- Each item has an SLA deadline: yellow when close, red when overdue.
- Four-eyes principle (maker-checker): whoever prepared a case cannot approve it.
- How approval steps are defined: two options, see "Workflow models" below.

## Case collaboration

- Case members: the supervisor adds analysts to a case.
- Threaded comments with replies, `@` mentions (send a notification),
  attachments, edit history, live updates.
- Private notes visible only to their author.

## Access model

A record is visible only when all layers pass, checked on the server (not only
hidden in the UI):

1. Permission: the user may do this action (for example view cases).
2. Region: the record's branch is in the user's regions.
3. Clearance: the user's level is at least the record's level (for example a case
   about a politically exposed person is "strictly confidential").
4. Case membership (case comments and notes only): the user is a member of the case.

## Forms

Hand-built with React Hook Form + Zod; the same Zod schema is used on the server.
(The config-driven form builder is a separate demo.)

- Multi-step forms (case creation, customer onboarding) with per-step validation
  and autosaved drafts.
- Conditional fields (person vs company); dependent selects (country → city →
  branch).
- Nested field arrays (shareholders, each with documents; related parties, each
  with several accounts).
- Cross-field validation (shares sum to 100%, start before end, min below max).
- Async validation (IBAN check, unique email).
- Recursive form: the AND/OR rule builder.
- Unsaved-changes guard on navigation.
- Server errors mapped to their fields.
- Accessibility: error summary at the top, focus moves to the first invalid field.

## Data model (main entities)

- Access: User, Role, Permission, Region, Branch, ClearanceLevel, CaseMember.
- Bank: Customer (person or company, with shareholders), Account, Transaction
  (amount, currency, base amount, from/to account, country, channel, time,
  location).
- Monitoring: Rule (criteria as JSON), Job, JobRun, Alert, Case (parties,
  attachments), Comment, PrivateNote.
- Workflow (model B only): WorkflowDefinition, WorkflowVersion, WorkflowStep,
  WorkflowTransition.
- User features: Notification, NewsPost, NewsRead, SavedSearch, QuickAccessItem,
  UserPreference, ImportBatch, AuditLog.

## Workflow models (decided: model B)

### Model A: fixed approval chain

- The case flow is in code: analyst → supervisor → compliance manager, with the
  four-eyes rule.
- Small and predictable; less to build and test.
- The separate React Flow demo (notes/demos.md, item 10) stays as planned.

### Model B: workflow designer with React Flow

- An admin draws the case workflow: steps (states), transitions, the role allowed
  to act at each step, conditions (for example: amount above 1M EUR → extra
  approval by the compliance manager), SLA per step.
- The drawing is validated before publishing (one start, every step reachable,
  no dead ends) and stored as JSON.
- Versioning: publishing creates a new version; open cases keep the version they
  started with.
- "My work" and the case page read the allowed actions from the workflow, so the
  same engine drives the inbox.
- Cost: noticeably more scope (designer UI, validation, versioning, a small
  workflow engine on the server, more tests).
- Chosen: the separate React Flow demo (item 10) changes to a brainstorming tool,
  so the two do not overlap and the demo count stays 21.

## Not in scope

- Support tickets or support chat (the separate chat demo covers sockets; case
  comments cover collaboration).
- Config-driven form builder (separate demo).

## Decisions (2026-10-16)

1. Workflow: model B (React Flow workflow designer).
2. Repo: `aml-dashboard` (public), subdomain `aml-dashboard.ali-moradi-develop.com`.
   The product name shown in the UI is chosen during design.
3. AG Grid Enterprise features. Without a license key it shows a watermark and a
   console message; check the license terms and say so in the README.
4. Stack (chosen by the shape of the data and the needs, not by popularity):
   - Web app: Next.js (App Router). httpOnly cookie auth, permission checks on the
     server, locale routes (`/en`, `/de`, ...), first data load on the server;
     grids, charts and graphs run in the browser. SEO does not matter (behind login).
   - A small separate Node.js service for scheduled rule runs (cron) and live
     updates (notifications, case comments): Next.js is not suited to long-running
     background work or persistent connections.
   - Turborepo monorepo: web app, service and shared packages (Zod schemas, types).
     Shows three CV claims at once: Next.js, Turborepo, Node.js.
   - Database: Postgres, not MongoDB. The data is relational (joins everywhere),
     reports are aggregations, case approval needs ACID transactions, the account
     graph uses `WITH RECURSIVE`, rule criteria and workflow definitions live in
     JSONB, and Row-Level Security can enforce region and clearance in the
     database itself. MongoDB is used in the chat demo instead.

## Open decisions

1. Release plan: split the scope into versions (first topic of the build session,
   together with the step-by-step project-start workflow).

## Next session (separate, build-focused)

- Opens only the new public repo, not this roadmap repo.
- Copy this brief into the new repo (for example `docs/brief.md`) WITHOUT the
  "Background and confidentiality" section: the public repo must not mention the
  previous project. Keep only the rule "no code or data from earlier employers".
- Connect Figma in the claude.ai connector settings before it starts.
- Topics in order: how to start a project properly (interview-style workflow),
  versions, Figma design using the Apple HIG skill, then the build.
