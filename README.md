# HygieneTrack

A lightweight hand hygiene compliance tracker for clinical or care settings. Staff scan a QR code posted at a hand hygiene station; the scan is recorded with their name, location, and timestamp. No app install required — it works from any phone camera.

## How it works

1. An admin generates a QR code for each physical station (sink, dispenser, etc.)
2. The QR code is printed and posted at that station
3. Staff scan it with their phone camera — the browser opens automatically
4. First-time users enter their name or badge ID (saved as a cookie for future scans)
5. Each scan is logged to a local SQLite database
6. Admins view compliance data on the dashboard

## Stack

- **Runtime:** Node.js v18+ (uses built-in `node:sqlite`, experimental in Node 22)
- **Server:** Express
- **Database:** SQLite via Node's built-in `node:sqlite` module (no separate DB install needed)
- **QR codes:** `qrcode` npm package
- **Frontend:** Plain HTML/CSS, no framework

## Setup

```bash
npm install
npm start
```

Server starts at `http://localhost:3000`.

For development with auto-restart on file changes:

```bash
npm run dev
```

> **Windows PowerShell note:** If you get a script execution policy error, run this once in PowerShell:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

## Pages & endpoints

| URL | Purpose |
|-----|---------|
| `http://localhost:3000/admin.html` | Admin dashboard — view all scans and stats |
| `http://localhost:3000/qr-generator` | Generate and print QR codes for locations |
| `http://localhost:3000/scan?location=<name>` | Scan endpoint — what the QR code links to |
| `http://localhost:3000/register` | Name registration (redirected here on first scan) |
| `GET /api/scans` | JSON — last 500 scans |
| `GET /api/stats` | JSON — total scans and scans today |
| `GET /api/qr?location=<name>` | JSON — QR code data URL for a given location |

## Data

Scans are stored in `scans.db` (SQLite) in the project root. The file is created automatically on first run. Schema:

```sql
CREATE TABLE scans (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name   TEXT NOT NULL,
  location    TEXT NOT NULL,
  scanned_at  DATETIME DEFAULT (datetime('now'))
)
```

The database file is local — back it up manually or add it to a scheduled job if persistence matters.

## Deploying beyond localhost

The QR codes embed the server's hostname. For phones on the same network to reach the server, either:

- Run on a machine with a static local IP and use that IP as the host, or
- Deploy to a cloud host (Render, Railway, Fly.io, etc.) and set the `PORT` environment variable

The `req.protocol` and `req.get('host')` values in `server.js:179` are used to build scan URLs — no config change needed when the host changes, as long as requests arrive with the correct `Host` header.
