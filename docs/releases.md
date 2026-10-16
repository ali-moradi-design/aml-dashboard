# Release plan

Goal: a portfolio piece that shows the author can build a complex dashboard
(complex forms, charts, grids, excellent UI). Audience: first HR (looks at the
live demo, so visual quality first), then senior engineers and tech leads (read
the code, so the architecture must be clean). No deadline; every release must be
shippable on its own, so stopping after any release still leaves a finished piece.

Rule: each feature gets its look right first, then its code.

## Release 1: core, visual impact

- Foundation: Turborepo, Next.js, Node.js service skeleton, Postgres, CI, lint, tests.
- i18n foundation: locale routes (`/en`, `/de`, `/tr`, `/ar`, `/fa`), `dir="rtl"`,
  logical CSS only, mirrored icons, `Intl` formatting, fonts, AG Grid RTL.
  Full text in English and Persian only; the other three languages are filled in later.
- Login with demo accounts per role; layered access model checked on the server.
- Overview with KPI cards and charts (different per role).
- Alerts grid and alert detail.
- Transactions grid (large data) with AND/OR advanced search.
- Light and dark theme.

## Release 2: complex forms

- Cases: multi-step form, nested field arrays, cross-field and async validation,
  autosaved drafts, unsaved-changes guard, server errors mapped to fields.
- Customers with KYC form and risk gauge.
- Rule builder (recursive AND/OR form).

## Release 3: graph and workflow

- Account network graph (Sigma.js).
- Workflow designer (React Flow), versioning, engine on the server.

## Release 4: completion

- Reports, scheduled jobs, data import, news, notification center, settings, admin.

## Release 5: remaining languages

- German, Turkish, Arabic text; German length checked against the design.

## Order of the project start

1. Goal and audience (done).
2. Release plan (this file).
3. Figma design with the Apple HIG skill (needs the Figma connector).
4. Technical skeleton.
5. Build release 1.
