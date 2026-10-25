# Technical decisions

Decided with the author on 2026-10-17. Earlier decisions from `brief.md`
(Next.js, Turborepo, Postgres) still hold.

## Structure

- Turborepo monorepo with pnpm workspaces.
  - `apps/web`: Next.js (App Router). User interface only; reads data from the API.
  - `apps/api`: Express. The whole backend: data, permissions, login, scheduled
    rule runs and live updates.
  - `packages/*`: shared code (Zod schemas and types, config).

## Backend (`apps/api`)

- Express with a layered architecture written in a functional style:
  routes → handlers (HTTP only) → services (pure domain logic) → repositories
  (database access). No classes; dependencies are passed in as function
  arguments (factory functions), so every layer can be tested alone.
- Errors as values with `neverthrow` (`Result`, `ResultAsync`) instead of
  throwing; one place maps domain errors to HTTP responses.
- Database: Postgres with Prisma. Recursive queries (account graph) and
  Row-Level Security use Prisma's raw SQL where needed.
- Scheduled jobs: pg-boss (queue and cron on the same Postgres, no Redis).
- Live updates: Socket.IO (rooms per case and per user).
- Validation: Zod schemas shared with the web app.

## Frontend (`apps/web`)

- Architecture: Feature-Sliced Design (FSD). Layers from top to bottom:
  `_app` (providers, global styles, theme) → `_pages` → `widgets` →
  `features` → `entities` → `shared` (UI kit, API client, lib, config).
  A layer imports only from layers below it; each slice exposes a public
  `index.ts`. The `app` and `pages` layers carry an underscore so they do not
  clash with Next.js folders (fsd.how guide for Next.js). Next.js routes live in
  the root `app/` folder, stay thin and render FSD pages.
- Styling: Tailwind CSS (required), logical classes such as `ms-*`, `me-*`
  for RTL. The theme (light and dark) is built from the Figma tokens as CSS
  variables and mapped into Tailwind's theme.
- UI components: shadcn/ui, restyled with the project's design tokens, kept in
  `shared/ui`.
- Server data: TanStack Query (React Query). For every API endpoint:
  - one promise function in the slice's `api` segment that calls the endpoint
    and returns typed data (for example `getAlerts(params): Promise<AlertPage>`),
  - one custom hook that wraps it (for example `useAlerts(params)` with
    `useQuery`, `useCloseAlert()` with `useMutation`), with query keys kept in
    one place per entity.
- Light/dark theme: next-themes (sets `data-theme` on `<html>`, light by
  default, no flash on load). Other small UI state (sidebar): Zustand.
- Forms: React Hook Form + Zod.
- Translations: i18next, locale in the URL (`/en`, `/fa`, ...).
- Charts: Highcharts (non-commercial license; say so in the README).
- Tables: TanStack Table v9 (headless, MIT). Sorting and paging run in the API,
  React Query owns the rows, markup and RTL are ours, so the look follows the
  design tokens fully.
- Account graph: Sigma.js 4 on graphology (ForceAtlas2 layout, Louvain clusters). Neighbors
  and shortest paths come from Postgres `WITH RECURSIVE` over internal transfers; the walk only
  expands from accounts inside the user's regions and clearance, others are shown masked.
- Workflow designer: React Flow. The graph is JSON per version (draft, published, archived);
  publishing archives the previous version and open cases keep the version they started with.
  One pure engine in `@aml/shared` (validation, available actions, SLA) is used by the
  designer, the API and the My work inbox.

## Quality

- Vitest for unit tests (services, rule engine, workflow engine).
- Playwright for browser tests, including RTL layouts.
- ESLint and Prettier.

## Deployment

- Docker Compose on the VPS (web, api, Postgres) behind Nginx with HTTPS via
  certbot. GitHub Actions for tests and deployment.

## Login and sessions

- Hand-built in Express (Auth.js was dropped because login moved to Express):
  a `sessions` table in Postgres, an opaque random session token in an
  httpOnly, Secure, SameSite=Lax cookie (only its hash is stored), passwords
  hashed with argon2. This also gives the "active sessions" list and
  "sign out everywhere" in settings.
