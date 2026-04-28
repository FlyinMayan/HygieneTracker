// ── Dark mode ────────────────────────────────────────────────────────────────
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

// ── State ────────────────────────────────────────────────────────────────────
let activeDays = 1;
let trendChart, deptChart;

// ── Date range buttons ────────────────────────────────────────────────────────
document.querySelectorAll('.range-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeDays = parseInt(btn.dataset.days);
    loadAll();
  });
});

document.getElementById('exportBtn').addEventListener('click', e => {
  e.preventDefault();
  window.location.href = `/api/reports/export?days=${activeDays}`;
});

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Trend chart (Chart.js) ────────────────────────────────────────────────────
async function loadTrend() {
  const res  = await fetch(`/api/reports/trend?days=${activeDays}`);
  const raw  = await res.json();
  const data = fillDates(raw, activeDays);

  const labels = data.map(d => {
    const dt = new Date(d.date + 'T12:00:00');
    return activeDays === 1
      ? 'Today'
      : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Scans',
        data: data.map(d => d.count),
        borderColor: '#059669',
        backgroundColor: 'rgba(5,150,105,0.08)',
        borderWidth: 2,
        pointRadius: activeDays <= 7 ? 4 : 2,
        pointBackgroundColor: '#059669',
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
        x: { grid: { display: false }, ticks: { maxTicksLimit: 14 } }
      }
    }
  });
}

// ── Department chart (Chart.js) ───────────────────────────────────────────────
async function loadDept() {
  const res  = await fetch(`/api/reports/by-department?days=${activeDays}`);
  const data = await res.json();
  const palette = ['#059669', '#0d9488', '#0284c7', '#7c3aed', '#db2777', '#d97706'];

  if (deptChart) deptChart.destroy();
  deptChart = new Chart(document.getElementById('deptChart'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.department),
      datasets: [{
        label: 'Scans',
        data: data.map(d => d.count),
        backgroundColor: data.map((_, i) => palette[i % palette.length]),
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        y: { grid: { display: false } }
      }
    }
  });
}

// ── Activity heatmap (D3) ─────────────────────────────────────────────────────
async function loadHeatmap() {
  const res  = await fetch(`/api/reports/heatmap?days=${activeDays}`);
  const data = await res.json();

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const grid = {};
  data.forEach(d => { grid[`${d.day_of_week}-${d.hour}`] = d.count; });
  const maxCount = d3.max(data, d => d.count) || 1;

  const container = document.getElementById('heatmapContainer');
  container.innerHTML = '';

  const totalW  = container.clientWidth || 420;
  const margin  = { top: 16, right: 12, bottom: 28, left: 40 };
  const cellW   = Math.floor((totalW - margin.left - margin.right) / 7);
  const cellH   = 16;
  const svgH    = cellH * 24 + margin.top + margin.bottom;

  const svg = d3.select('#heatmapContainer')
    .append('svg')
    .attr('width', totalW)
    .attr('height', svgH)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const color = d3.scaleSequential()
    .domain([0, maxCount])
    .interpolator(d3.interpolate('#e8f5e9', '#047857'));

  // Cells
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const count = grid[`${day}-${hour}`] || 0;
      svg.append('rect')
        .attr('x', day * cellW)
        .attr('y', hour * cellH)
        .attr('width', cellW - 2)
        .attr('height', cellH - 2)
        .attr('rx', 2)
        .attr('fill', count === 0 ? '#f1f5f9' : color(count))
        .append('title')
        .text(`${dayLabels[day]} ${hourLabel(hour)}: ${count} scan${count !== 1 ? 's' : ''}`);
    }
  }

  // Day labels (x-axis)
  svg.selectAll('.day-label')
    .data(dayLabels)
    .enter().append('text')
    .attr('x', (d, i) => i * cellW + cellW / 2 - 1)
    .attr('y', 24 * cellH + 18)
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px')
    .attr('fill', '#6b7280')
    .text(d => d);

  // Hour labels (y-axis) — every 6 hours
  [0, 6, 12, 18].forEach(h => {
    svg.append('text')
      .attr('x', -6)
      .attr('y', h * cellH + cellH / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('fill', '#6b7280')
      .text(hourLabel(h));
  });
}

// ── Per-person table ──────────────────────────────────────────────────────────
async function loadPersonTable() {
  const res  = await fetch(`/api/reports/by-person?days=${activeDays}`);
  const data = await res.json();
  const tbody = document.getElementById('personTableBody');

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No data for this period.</td></tr>';
    return;
  }

  const max = data[0].count;
  tbody.innerHTML = data.map((p, i) => `
    <tr>
      <td class="rank-cell">${i + 1}</td>
      <td>${escapeHtml(p.user_name)}</td>
      <td>${escapeHtml(p.department)}</td>
      <td>${escapeHtml(p.unit)}</td>
      <td>
        <div class="bar-cell">
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.round((p.count / max) * 100)}%"></div>
          </div>
          <span class="bar-label">${p.count}</span>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Load all ──────────────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadTrend(), loadDept(), loadHeatmap(), loadPersonTable()]);
}

loadAll();
