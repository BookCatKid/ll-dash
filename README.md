# LL Dash — Self-Hostable FTC Competition Dashboard

A mobile-first PWA dashboard for *FIRST* Tech Challenge teams: live schedules,
rankings, OPR stats, scouting, alliance-selection pick lists, a ranking
simulator and a big-screen pit display — all backed by the official
[FTC Events API](https://ftc-events.firstinspires.org/services/API) and
[FTCScout](https://ftcscout.org).

Originally built by FTC Team 3650 (Limited Liability) as "LL Dash" — now fully
configurable so **any team can self-host it under their own name, colors and
scouting workflow**. No code changes required.

## Features

- **Setup wizard** — first visit walks you through FTC API credentials
  (validated live), team number, season, PIN, dashboard name and theme colors.
  Everything is stored in the database; change it any time from ⚙ Settings.
- **Dashboard** — next-match countdown, last match result, your team's stats.
- **Schedule** — full hybrid schedule with scores, RP breakdowns and OPR-based
  match predictions.
- **Rankings** — sortable rankings with global/event OPR from FTCScout.
- **Scouting** — *configurable* note form: define your own fields
  (text, textarea, number, select, star rating) in Settings → Scout Fields.
- **Alliance** — pick list with *custom flag categories* (name + color, e.g.
  Target / Do Not Pick / Sleeper), plus side-by-side team comparison.
- **Simulator** — what-if qualification ranking projections.
- **Playoffs** — alliance lineups and the playoff bracket grouped by round,
  with scores and winner highlighting.
- **Awards** — event awards grouped by judged/performance category, with your
  team's awards highlighted.
- **Hub** — team notes and pit/inspection checklists.
- **Big Screen** — a high-contrast, auto-refreshing pit display (Display tab)
  showing the schedule with the current match highlighted, field assignments,
  scores, rankings and the playoff bracket. Panels, refresh interval and
  auto-cycle interval are configurable. Press Esc or ✕ to exit.
- **Deep display customization** — one-click theme presets, light/dark mode,
  compact density, and full nav reordering/visibility per tab.
- **Data export** — scouting notes (CSV/JSON with columns that follow your
  scouting field schema), alliance flags and hub notes/checklists.
- **PWA** — installable on phones, works as a home-screen app, offline-tolerant.

## Stack

Flask + SQLAlchemy (PostgreSQL or SQLite) backend, Svelte 5 frontend compiled with Vite. The built bundle is **not** committed — `pnpm build` generates `frontend/static/build/` on demand, so deploys always serve a fresh build.

## Hosting and storage

Live schedules, rankings, scores, awards, team details, and OPR come from FIRST Events and FTCScout. They do not need a database. Persistent storage is only used for shared team data:

- Setup, FTC API credentials, PIN, theme, and navigation settings.
- Scouting notes and alliance-pick flags shared across devices.
- Hub notes and custom checklists.

Individual checklist completion and per-device tab visibility already use browser storage.

**A separate PostgreSQL service is not required.** The existing SQLAlchemy backend can use a SQLite file on a persistent disk. A VM or other always-on host with persistent storage is a straightforward option for a team that wants a private, shared dashboard. Back up the SQLite file regularly.

The included [`render.yaml`](render.yaml) is suitable for temporary evaluation, not permanent free hosting. [Render's free PostgreSQL expires after 30 days](https://render.com/docs/free), and free web service filesystems are ephemeral. Do not rely on either for durable scouting data. A paid persistent database or a host with a persistent disk is required to retain shared information reliably.

To deploy, set a strong `SECRET_KEY` and point `DATABASE_URL` at your persistent SQLite file or PostgreSQL instance. Start the app with `gunicorn "app:create_app()" --bind 0.0.0.0:$PORT` or a comparable process manager. On first visit the setup wizard requests your FTC Events API credentials, team number, and PIN.

### Deploy to Oracle Cloud (free forever, recommended)

The production deployment runs on an Oracle Cloud Always Free ARM VM behind a
Cloudflare Tunnel at `lldash.smrff.dev`:

- **App**: `gunicorn "app:create_app()"` on `127.0.0.1:5000` via the
  `lldash.service` systemd unit (auto-restarts on boot/crash).
- **Database**: SQLite at `~/lldash/lldash.db` (persistent disk).
- **Exposure**: `cloudflared` service runs a remotely-managed tunnel
  (`lldash.smrff.dev` → `localhost:5000`) — no open ports needed.
- **Auto-deploy**: `scripts/deploy-oracle.sh` runs from cron every 2 minutes,
  pulls `origin/main`, reinstalls deps if needed, and restarts the service.
  Just `git push origin main`.

To reproduce on a fresh VM:

```bash
mkdir -p ~/lldash && cd ~/lldash
git clone https://github.com/<you>/ll-dash.git .
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
printf 'SECRET_KEY=<random>\nDATABASE_URL=sqlite:////home/ubuntu/lldash/lldash.db\n' > .env
# systemd unit: WorkingDirectory=~/lldash, EnvironmentFile=.env,
# ExecStart=.venv/bin/gunicorn "app:create_app()" --bind 127.0.0.1:5000 --workers 2
# then: sudo systemctl enable --now lldash
# cloudflared: sudo cloudflared service install <tunnel-token>
# cron: */2 * * * * /home/ubuntu/lldash/deploy.sh >> ~/lldash/deploy.log 2>&1
```

## Run locally

```bash
git clone <your fork>
cd ll-dash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env                 # set SECRET_KEY and DATABASE_URL
# SQLite works without a separate PostgreSQL service.
# Point DATABASE_URL at a writable, persistent SQLite file.

python app.py                        # http://127.0.0.1:5000
```

The first visit launches the setup wizard, same as production.

## Frontend components

Every application screen, dialog, and control is implemented in Svelte 5 under
`frontend/ui/`. `pnpm build` compiles them to `frontend/static/build/`, which
Flask serves at `/static/build/app.js`. The output is gitignored — always
rebuild before deploying or testing UI changes.

```bash
pnpm install
pnpm run check
pnpm run build
pnpm test
```

## Database setup & migrations

Tables are created automatically on first boot (`db.create_all()`) in either
SQLite or PostgreSQL. When upgrading an existing
deployment, lightweight column migrations also run automatically at startup —
no manual steps.

To initialize a database without starting the server:

```bash
python -c "from app import create_app; create_app()"
```

## Configuration

All configuration lives in the `app_settings` table and is managed in-app:

| Where | What |
|---|---|
| Setup wizard (first run) | FTC API credentials, team number, season, PIN, name, theme |
| ⚙ Settings → Event | Season + active event (searchable) |
| ⚙ Settings → Display | Dashboard name, theme presets, custom colors (live preview), light/dark mode, compact density |
| ⚙ Settings → Scout Fields | Add/remove/reorder scouting form fields |
| ⚙ Settings → Flags | Custom alliance flag categories (name, color, emoji) |
| ⚙ Settings → Pages | Nav tab order & visibility (incl. Playoffs/Awards), Big Screen panels + cycle/refresh intervals, award highlighting |
| ⚙ Settings → Data | Export scouting notes, flags and hub data as CSV/JSON |
| ⚙ Settings → Team & API | Team number, PIN, FTC API credentials |

Environment variables (see [`.env.example`](.env.example)) are only needed for
`SECRET_KEY`/`DATABASE_URL`; the team-specific ones are optional fallbacks
that pre-seed the database and skip the wizard — handy for deployments that
predate the wizard.

## Attribution

Event data is provided by the
[*FIRST* Events API](https://frc-events.firstinspires.org/services/API).
This project is community-built and is not affiliated with or endorsed by
*FIRST*. OPR statistics courtesy of [FTCScout](https://ftcscout.org).
