// ── Dark mode ─────────────────────────────────────────────────────────────────
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

// ── Load current settings ─────────────────────────────────────────────────────
async function loadSettings() {
  const res = await fetch('/api/settings');
  const settings = await res.json();
  document.getElementById('dailyTarget').value = settings.daily_target;
}

// ── Save ──────────────────────────────────────────────────────────────────────
document.getElementById('saveBtn').addEventListener('click', async () => {
  const val = parseInt(document.getElementById('dailyTarget').value);
  const status = document.getElementById('saveStatus');

  if (!val || val < 1 || val > 100) {
    status.textContent = 'Please enter a number between 1 and 100.';
    status.className = 'save-status save-status--error';
    return;
  }

  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ daily_target: val })
  });

  status.textContent = 'Saved.';
  status.className = 'save-status save-status--ok';
  setTimeout(() => { status.textContent = ''; }, 3000);
});

loadSettings();
