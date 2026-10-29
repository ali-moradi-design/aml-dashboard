# Deployment

Production runs on the VPS as three containers (`compose.yaml`): Postgres, the API and the web
app. GitHub Actions builds the images after CI passes on `main` (`.github/workflows/docker.yml`),
pushes them to ghcr.io tagged with the commit SHA, and deploy-kit's `deploy-app` on the server
pulls them and restarts. Nothing is built on the server.

- `compose.yaml`: copy to `/srv/apps/aml-dashboard/compose.yaml`.
- `.env.example`: the variables for `/srv/apps/aml-dashboard/.env` (600, owner deploy).
- `nginx.conf`: the host Nginx site. `/api/` (REST and Socket.IO) goes to the API on
  `127.0.0.1:3107` with the prefix removed; everything else goes to the web app on
  `127.0.0.1:3106`. One origin, so the `aml_session` cookie reaches both and `proxy.ts` sees it.

How it fits together:

- The web image is built with `NEXT_PUBLIC_API_URL=https://aml-dashboard.ali-moradi-develop.com/api`
  (public; it goes into the browser bundle and the CSP). Socket.IO connects to the origin with
  the path `/api/socket.io`.
- The API applies pending migrations on start (`prisma migrate deploy`), then serves.
- `TRUST_PROXY=1` makes `req.ip` the visitor's address (per-IP upload limit).
- Nightly demo reset: `DEMO_RESET_CRON` runs the seed inside the API at 03:00 UTC (about 70 s,
  everyone is signed out, uploads are deleted). No server cron is needed.
- Memory: the seed peaks at about 780 MB inside the API container, so the API has a 1 GB limit
  and a fixed 512 MB heap (`NODE_OPTIONS`); idle it uses about 170 MB.

First start: after the first deploy, seed once:

```bash
cd /srv/apps/aml-dashboard
docker compose exec -T api node dist/seed.js
```
