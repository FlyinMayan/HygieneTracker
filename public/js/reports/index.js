// ── Shared state ─────────────────────────────────────────────────────────────
let activeDays = 1;
let trendChart, deptChart;

// ── Shared helpers ────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hourLabel(h) {
  if (h === 0)  return '12am';
  if (h < 12)   return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function fillDates(rows, days) {
  const map = {};
  rows.forEach(r => { map[r.date.slice(0, 10)] = r.count; });
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map[key] || 0 });
  }
  return result;
}

// ── Dark mode ─────────────────────────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');

function applyTheme() {
  themeToggle.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
}

themeToggle.addEventListener('click', () => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  localStorage.setItem('theme', dark ? 'light' : 'dark');
  applyTheme();
});

applyTheme();

// ── Date range buttons ────────────────────────────────────────────────────────
document.querySelectorAll('.range-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeDays = parseInt(btn.dataset.days);
    loadAll();
  });
});

// ── Export ────────────────────────────────────────────────────────────────────
document.getElementById('exportBtn').addEventListener('click', e => {
  e.preventDefault();
  window.location.href = `/api/reports/export?days=${activeDays}`;
});

// ── Load all ──────────────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadTrend(), loadDept(), loadHeatmap(), loadPersonTable()]);
}

loadAll();
