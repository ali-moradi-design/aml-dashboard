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
pnpm db:up      # Postgres in Docker
pnpm dev        # web on :3000, api on :4000
```

Other commands: `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm format`.

## Licenses of third-party parts

- Fonts (Huninn, Vazirmatn, Geist Mono): SIL Open Font License, files and
  licenses in `apps/web/src/shared/assets/fonts`.
- Highcharts and AG Grid Enterprise (added later) are used under their
  non-commercial / evaluation terms; AG Grid shows a watermark without a key.
