// ── Sidebar ───────────────────────────────────────────────────────────────────
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const hamburger      = document.getElementById('hamburger');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
}

hamburger.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
sidebarOverlay.addEventListener('click', closeSidebar);

// Close sidebar on nav link click (mobile)
document.querySelectorAll('.sidebar-link[href]').forEach(a => {
  a.addEventListener('click', closeSidebar);
});

// ── Settings modal ───────────────────────────────────────────────────────────
async function openSettings() {
  const res = await fetch('/api/settings');
  const settings = await res.json();
  document.getElementById('dailyTargetInput').value = settings.daily_target;
  document.getElementById('settingsModal').classList.add('open');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('open');
}

document.getElementById('sidebarSettingsBtn').addEventListener('click', () => { closeSidebar(); openSettings(); });
document.getElementById('cancelSettings').addEventListener('click', closeSettings);
document.getElementById('settingsModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeSettings();
});

document.getElementById('saveSettings').addEventListener('click', async () => {
  const val = parseInt(document.getElementById('dailyTargetInput').value);
  if (!val || val < 1) return;
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ daily_target: val })
  });
  closeSettings();
});

// ── Dark mode ────────────────────────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');

function syncToggle() {
  themeToggle.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
}

themeToggle.addEventListener('click', () => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  localStorage.setItem('theme', dark ? 'light' : 'dark');
  syncToggle();
});

syncToggle();

// ── State ────────────────────────────────────────────────────────────────────
let allScans = [];
let sortCol = 'scanned_at';
let sortDir = 'desc';
let currentPage = 1;
const PAGE_SIZE = 25;

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(isoStr) {
  return new Date(isoStr).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getFiltered() {
  const q = document.getElementById('filterInput').value.toLowerCase().trim();
  if (!q) return allScans;
  return allScans.filter(s =>
    s.user_name.toLowerCase().includes(q) ||
    s.location.toLowerCase().includes(q) ||
    (s.department || '').toLowerCase().includes(q) ||
    (s.unit || '').toLowerCase().includes(q)
  );
}

function getSorted(scans) {
  return [...scans].sort((a, b) => {
    let av = a[sortCol] ?? '';
    let bv = b[sortCol] ?? '';
    if (sortCol === 'scanned_at') {
      av = new Date(av).getTime();
      bv = new Date(bv).getTime();
    } else {
      av = av.toLowerCase();
      bv = bv.toLowerCase();
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
  const filtered = getFiltered();
  const sorted = getSorted(filtered);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const page = sorted.slice(start, start + PAGE_SIZE);

  document.getElementById('resultCount').textContent =
    total === allScans.length
      ? `${total.toLocaleString()} records`
      : `${total.toLocaleString()} of ${allScans.length.toLocaleString()}`;

  const tbody = document.getElementById('scanTableBody');
  if (!page.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No scans found.</td></tr>';
  } else {
    tbody.innerHTML = page.map(s => `
      <tr>
        <td>${escapeHtml(s.user_name)}</td>
        <td>${escapeHtml(s.department || '—')}</td>
        <td>${escapeHtml(s.unit || '—')}</td>
        <td>${escapeHtml(s.location)}</td>
        <td>${formatDate(s.scanned_at)}</td>
      </tr>
    `).join('');
  }

  document.querySelectorAll('thead th[data-col]').forEach(th => {
    const icon = th.querySelector('.sort-icon');
    th.classList.remove('sort-asc', 'sort-desc');
    icon.textContent = '';
    if (th.dataset.col === sortCol) {
      th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      icon.textContent = sortDir === 'asc' ? ' ▲' : ' ▼';
    }
  });

  const pag = document.getElementById('pagination');
  if (totalPages <= 1) {
    pag.innerHTML = '';
    return;
  }
  pag.innerHTML = `
    <button onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>
    <span class="page-info">Page ${currentPage} of ${totalPages}</span>
    <button onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>
  `;
}

function goPage(n) {
  currentPage = n;
  render();
}

function onFilter() {
  currentPage = 1;
  render();
}

document.querySelectorAll('thead th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    if (sortCol === th.dataset.col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortCol = th.dataset.col;
      sortDir = th.dataset.col === 'scanned_at' ? 'desc' : 'asc';
    }
    currentPage = 1;
    render();
  });
});

document.getElementById('filterInput').addEventListener('input', onFilter);

// ── Data loading ─────────────────────────────────────────────────────────────
async function loadData() {
  const [scansRes, statsRes] = await Promise.all([
    fetch('/api/scans'),
    fetch('/api/stats')
  ]);
  allScans = await scansRes.json();
  const stats = await statsRes.json();
  document.getElementById('todayCount').textContent = stats.today.toLocaleString();
  document.getElementById('totalCount').textContent = stats.total.toLocaleString();
  render();
}

loadData();
setInterval(loadData, 30000);
