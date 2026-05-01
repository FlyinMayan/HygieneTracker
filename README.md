# HygieneTrack

A hand hygiene compliance tracker for clinical and care settings. Staff scan a QR code posted at a hand hygiene station; the scan is recorded with their name, department, unit, location, and timestamp. No app install required — works from any phone camera.

## How it works

1. An admin generates a QR code for a physical station (sink, dispenser, etc.) via the QR Generator
2. The code is printed and posted at that station
3. Staff scan it with their phone camera — the browser opens automatically
4. First-time users enter their name/badge ID, department, and unit (saved as a cookie for future scans)
5. Each scan is logged to the database with a 60-second deduplication window
6. Admins view live scan data, reports, and compliance rates on the dashboard

## Stack

- **Runtime:** Node.js v22+ (required for `node:sqlite` used in dev; production uses Postgres)
- **Server:** Express
- **Database:** PostgreSQL (production) via `pg`
- **QR codes:** `qrcode` npm package
- **Charts:** Chart.js (trend, department) + D3.js (activity heatmap)
- **Frontend:** Plain HTML/CSS/JS, no framework

## Setup

```bash
npm install
npm start
```

Server starts at `http://localhost:3000`.

For development with auto-restart:

```bash
npm run dev
```

Requires a `DATABASE_URL` environment variable pointing to a PostgreSQL instance. For local dev, set it in your shell before starting:

```bash
# Mac/Linux
DATABASE_URL="postgresql://..." npm start

# Windows CMD
set DATABASE_URL=postgresql://...&& npm start
```

> **Windows PowerShell note:** If you get a script execution policy error, run this once:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

## Admin pages

| URL | Purpose |
|-----|---------|
| `/admin.html` | Dashboard — live scan table, stats, 30-day compliance |
| `/reports.html` | Reports — trend, department, heatmap, per-person compliance |
| `/settings.html` | Settings — configure compliance target, access QR generator |
| `/qr-generator` | Generate and print QR codes for stations |

## End-user pages (staff-facing)

| URL | Purpose |
|-----|---------|
| `/scan?location=<name>` | Scan endpoint — what the QR code links to |
| `/register` | First-time name/department/unit registration |

## API endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/scans` | Last 500 scans |
| `GET /api/stats` | Total scans + today count |
| `GET /api/settings` | Current settings (e.g. daily compliance target) |
| `POST /api/settings` | Update settings |
| `GET /api/reports/trend?days=N` | Daily scan counts for the last N days |
| `GET /api/reports/by-department?days=N` | Scan counts grouped by department |
| `GET /api/reports/by-person?days=N` | Scan counts grouped by person |
| `GET /api/reports/heatmap?days=N` | Scan counts by day-of-week × hour |
| `GET /api/reports/export?days=N` | CSV download of all scans in the period |
| `GET /api/qr?location=<name>` | QR code data URL for a given location |

## Database schema

```sql
CREATE TABLE scans (
  id          SERIAL PRIMARY KEY,
  user_name   TEXT NOT NULL,
  location    TEXT NOT NULL,
  department  TEXT,
  unit        TEXT,
  scanned_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Default setting: `daily_target = 8` (target washes per person per day, used to calculate compliance %).

## Frontend structure

```
public/
  admin.html          — dashboard
  reports.html        — reports
  settings.html       — settings
  style.css           — shared styles (includes dark mode)
  js/
    admin.js          — dashboard logic
    settings.js       — settings page logic
    loader.js         — page transition loading bar (shared)
    reports/
      index.js        — shared state, date range controls, dark mode
      trend.js        — scans over time / today by hour (Chart.js)
      department.js   — by department bar chart (Chart.js)
      heatmap.js      — activity heatmap by day & hour (D3)
      person.js       — per-person compliance table
```

## Compliance calculation

Compliance % per person = `min(100, actual_scans / (daily_target × days)) × 100`

Overall compliance = average across all active staff in the period. Color coded: green ≥ 80%, amber 50–79%, red < 50%.

## Deployment

Deployed on [Railway](https://railway.app) with a managed PostgreSQL database. The `DATABASE_URL` environment variable is set via a Railway variable reference linking the Postgres service to the app service.

QR scan URLs are built from `req.protocol` and `req.get('host')` at scan time, so they automatically reflect the correct hostname in any environment.

GitHub repo: [FlyinMayan/HygieneTracker](https://github.com/FlyinMayan/HygieneTracker)
