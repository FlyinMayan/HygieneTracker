const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const QRCode = require('qrcode');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlShell(title, body, extraHead = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — HygieneTrack</title>
  <link rel="stylesheet" href="/style.css">
  ${extraHead}
</head>
<body>
  ${body}
</body>
</html>`;
}

// ── Root redirect ───────────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/admin.html'));

// ── Scan endpoint — QR code lands here ──────────────────────────────────────
app.get('/scan', async (req, res) => {
  const location = req.query.location;

  if (!location) {
    return res.status(400).send(htmlShell('Error', `
      <div class="card error">
        <div class="icon">✗</div>
        <h1>Invalid QR Code</h1>
        <p>No location was specified in this QR code.</p>
      </div>
    `));
  }

  const userName = req.cookies.userName;

  if (!userName) {
    const redirectUrl = `/scan?location=${encodeURIComponent(location)}`;
    return res.redirect(`/register?redirect=${encodeURIComponent(redirectUrl)}`);
  }

  const department = req.cookies.department || '';
  const unit = req.cookies.unit || '';

  await db.recordScan(userName, location, department, unit);

  const now = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const safeUser = escapeHtml(userName);
  const safeLoc = escapeHtml(location);
  const safeDept = escapeHtml(department);
  const safeUnit = escapeHtml(unit);
  const changeUrl = escapeHtml(`/register?redirect=${encodeURIComponent(`/scan?location=${encodeURIComponent(location)}`)}`);

  res.send(htmlShell('Scan Recorded', `
    <div class="card success">
      <div class="icon">✓</div>
      <h1>Hand Hygiene Recorded!</h1>
      <div class="scan-details">
        <div class="detail-row">
          <span class="label">Who</span>
          <span class="value">${safeUser}</span>
        </div>
        ${safeDept ? `<div class="detail-row">
          <span class="label">Department</span>
          <span class="value">${safeDept}</span>
        </div>` : ''}
        ${safeUnit ? `<div class="detail-row">
          <span class="label">Unit</span>
          <span class="value">${safeUnit}</span>
        </div>` : ''}
        <div class="detail-row">
          <span class="label">Where</span>
          <span class="value">${safeLoc}</span>
        </div>
        <div class="detail-row">
          <span class="label">When</span>
          <span class="value">${now}</span>
        </div>
      </div>
      <a class="change-link" href="${changeUrl}">Not ${safeUser}? Update your info</a>
    </div>
  `));
});

// ── Registration page ────────────────────────────────────────────────────────
app.get('/register', (req, res) => {
  const redirect = req.query.redirect || '/';
  const safeRedirect = escapeHtml(redirect);

  res.send(htmlShell('Set Your Name', `
    <div class="card">
      <div class="icon neutral">👤</div>
      <h1>Who are you?</h1>
      <p>This will be remembered on your device for future scans.</p>
      <form method="POST" action="/register">
        <input type="hidden" name="redirect" value="${safeRedirect}">
        <input
          type="text"
          name="name"
          placeholder="Name or Badge ID"
          required
          autofocus
          autocomplete="name"
          maxlength="100"
        >
        <input
          type="text"
          name="department"
          placeholder="Department (e.g. ICU, ER, Surgery)"
          maxlength="100"
        >
        <input
          type="text"
          name="unit"
          placeholder="Unit (e.g. 4 North, PICU)"
          maxlength="100"
        >
        <button type="submit">Save &amp; Continue →</button>
      </form>
    </div>
  `));
});

app.post('/register', (req, res) => {
  const name = (req.body.name || '').trim().slice(0, 100);
  const department = (req.body.department || '').trim().slice(0, 100);
  const unit = (req.body.unit || '').trim().slice(0, 100);
  const redirect = req.body.redirect || '/';

  if (!name) {
    return res.redirect(`/register?redirect=${encodeURIComponent(redirect)}`);
  }

  const cookieOpts = { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: false, sameSite: 'lax' };
  res.cookie('userName', name, cookieOpts);
  res.cookie('department', department, cookieOpts);
  res.cookie('unit', unit, cookieOpts);
  res.redirect(redirect);
});

// ── QR Code generator (admin tool) ──────────────────────────────────────────
app.get('/qr-generator', (req, res) => {
  res.send(htmlShell('QR Generator', `
    <div class="card">
      <h1>QR Code Generator</h1>
      <p>Enter a location name to generate a printable QR code for that station.</p>
      <div class="input-row">
        <input type="text" id="locationInput" placeholder="e.g. ICU Room 204 Sink" />
        <button onclick="generate()">Generate</button>
      </div>
      <div id="result" class="qr-result hidden">
        <img id="qrImg" alt="QR Code">
        <p class="qr-location" id="qrLocation"></p>
        <p class="qr-url" id="qrUrl"></p>
        <button class="secondary" onclick="window.print()">🖨 Print</button>
      </div>
    </div>
    <a class="nav-link" href="/admin.html">← Admin Dashboard</a>
  `, `<style>
    @media print {
      .card h1, .card p:first-of-type, .input-row, button.secondary { display: none; }
      .qr-result { border: none; padding: 0; }
      .nav-link { display: none; }
    }
  </style>
  <script>
    async function generate() {
      const location = document.getElementById('locationInput').value.trim();
      if (!location) return;
      const res = await fetch('/api/qr?location=' + encodeURIComponent(location));
      const data = await res.json();
      document.getElementById('qrImg').src = data.qrDataUrl;
      document.getElementById('qrLocation').textContent = location;
      document.getElementById('qrUrl').textContent = data.url;
      document.getElementById('result').classList.remove('hidden');
    }
    document.getElementById('locationInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') generate();
    });
  </script>`));
});

// ── API: all scans ───────────────────────────────────────────────────────────
app.get('/api/scans', async (req, res) => {
  res.json(await db.getScans());
});

app.get('/api/stats', async (req, res) => {
  res.json(await db.getStats());
});

// ── Settings API ─────────────────────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  const dailyTarget = await db.getSetting('daily_target', '8');
  res.json({ daily_target: parseInt(dailyTarget) });
});

app.post('/api/settings', async (req, res) => {
  const val = parseInt(req.body.daily_target);
  if (!val || val < 1 || val > 100) return res.status(400).json({ error: 'Invalid target' });
  await db.setSetting('daily_target', val);
  res.json({ ok: true });
});

// ── Reports API ─────────────────────────────────────────────────────────────
function parseDays(query) {
  const d = parseInt(query.days);
  return (!d || d < 1 || d > 365) ? 30 : d;
}

app.get('/api/reports/trend', async (req, res) => {
  res.json(await db.getReportTrend(parseDays(req.query)));
});

app.get('/api/reports/by-department', async (req, res) => {
  res.json(await db.getReportByDepartment(parseDays(req.query)));
});

app.get('/api/reports/by-person', async (req, res) => {
  res.json(await db.getReportByPerson(parseDays(req.query)));
});

app.get('/api/reports/heatmap', async (req, res) => {
  res.json(await db.getReportHeatmap(parseDays(req.query)));
});

app.get('/api/reports/export', async (req, res) => {
  const days = parseDays(req.query);
  const rows = await db.getExportScans(days);
  const header = ['Name', 'Department', 'Unit', 'Location', 'Date & Time'].join(',');
  const body = rows.map(r => [
    `"${(r.user_name  || '').replace(/"/g, '""')}"`,
    `"${(r.department || '').replace(/"/g, '""')}"`,
    `"${(r.unit       || '').replace(/"/g, '""')}"`,
    `"${(r.location   || '').replace(/"/g, '""')}"`,
    `"${new Date(r.scanned_at).toLocaleString('en-US')}"`,
  ].join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="hygiene-${days}d.csv"`);
  res.send(`${header}\n${body}`);
});

// ── API: generate QR data URL ────────────────────────────────────────────────
app.get('/api/qr', async (req, res) => {
  const location = req.query.location;
  if (!location) return res.status(400).json({ error: 'location required' });

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const url = `${baseUrl}/scan?location=${encodeURIComponent(location)}`;
  const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
  res.json({ url, qrDataUrl });
});

db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`\nHygieneTrack running at http://localhost:${PORT}`);
    console.log(`  Scan example:    http://localhost:${PORT}/scan?location=ICU+Room+204`);
    console.log(`  Admin dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`  QR generator:    http://localhost:${PORT}/qr-generator\n`);
  });
}).catch(err => {
  console.error('Failed to connect to database:', err.message);
  process.exit(1);
});
